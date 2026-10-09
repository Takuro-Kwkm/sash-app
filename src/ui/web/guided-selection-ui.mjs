import { guidedSelectionContract as contract } from './guided-selection-contract.mjs';
import { admittedGuidedProducts, guidedOpeningChoices, recommendGuidedProducts, nextGuidedQuestion, reconcileGuidedAcknowledgements } from './guided-selection-engine.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const options = (rows, selected) => '<option value="">選択してください</option>' + rows.map(row => `<option value="${esc(row.value)}"${row.value === selected ? ' selected' : ''}>${esc(row.label)}</option>`).join('');
const action = (name, label, extra = '') => `<button type="button" class="button secondary" data-guided-action="${name}" ${extra}>${label}</button>`;

export class GuidedSelectionUI {
  constructor(editor, resolve) {
    this.editor = editor; this.resolve = resolve;
    const saved = editor.initialSnapshot?.workflow_data?.guided_selection;
    this.session = saved?.version === contract.version ? structuredClone(saved) : { version: contract.version, mode: 'normal', answers: {}, acknowledged: [] };
    this.step = 0; this.candidates = []; this.openings = []; this.busy = false; this.error = ''; this.editKey = null;
    this.boundChange = event => { void this.handleChange(event).catch(error => this.fail(error)); };
    this.boundClick = event => { void this.handleClick(event).catch(error => this.fail(error)); };
    editor.root.addEventListener('change', this.boundChange); editor.root.addEventListener('click', this.boundClick);
  }
  destroy() { this.editor.root.removeEventListener('change', this.boundChange); this.editor.root.removeEventListener('click', this.boundClick); }
  fail(error) { this.busy = false; this.error = error.message; this.render(); }
  get mode() { return this.session.mode === 'guided' ? 'guided' : 'normal'; }
  persist() {
    if (this.editor.state.snapshot && !this.editor.state.stale) {
      this.editor.state.snapshot.workflow_data = { ...this.editor.state.snapshot.workflow_data, guided_selection: structuredClone(this.session) };
    }
  }
  afterResolve(result) {
    this.session.acknowledged = reconcileGuidedAcknowledgements(this.previousResult, result, this.session.acknowledged);
    this.previousResult = result;
    if (this.session.candidate?.patch && Object.entries(this.session.candidate.patch).some(([key, value]) => result.selection[key] !== value)) {
      this.session.candidate.status = 'REVALIDATION_REQUIRED';
    }
    this.editKey = null; this.persist(); this.render();
  }
  notify() { this.persist(); if (this.editor.state.snapshot && !this.editor.state.stale) this.editor.onSnapshot(this.editor.state.snapshot, this.editor.state.resolved); }
  setMode(mode) { this.session.mode = mode; this.error = ''; this.notify(); this.render(); }
  activeProduct() { return admittedGuidedProducts(this.editor.state.products).find(p => p.id === this.editor.state.productId); }
  async handleChange(event) {
    const key = event.target.dataset.guidedAnswer;
    if (!key) return;
    this.session.answers[key] = event.target.value;
    this.candidates = []; this.error = ''; this.notify();
  }
  async handleClick(event) {
    const button = event.target.closest('[data-guided-action]');
    if (!button || this.busy) return;
    const name = button.dataset.guidedAction;
    if (name === 'normal' || name === 'guided') { this.setMode(name); return; }
    if (this.editor.state.stale) return;
    if (name === 'restart') { this.step = 0; this.session.searching = true; this.editKey = null; this.render(); return; }
    if (name === 'back') { this.step = Math.max(0, this.step - 1); this.error = ''; this.render(); return; }
    if (name === 'next') {
      const answers = this.session.answers;
      if (this.step === 0) {
        if (!answers.purpose || !answers.priority) throw new Error('用途と重視することを選択してください。');
        this.busy = true; this.render();
        this.openings = await guidedOpeningChoices({ inventory: this.editor.state.products, resolve: this.resolve, purpose: answers.purpose });
        this.busy = false;
        if (!this.openings.length) throw new Error('この用途は現在のかんたん選定の対象外です。通常入力で確認してください。');
        if (!this.openings.some(row => row.value === answers.opening)) delete answers.opening;
      }
      if (this.step === 1 && !answers.opening) throw new Error('開閉形式を選択してください。');
      this.step++; this.error = ''; this.notify(); this.render(); return;
    }
    if (name === 'search') {
      this.busy = true; this.error = ''; this.render();
      const result = await recommendGuidedProducts({ inventory: this.editor.state.products, resolve: this.resolve, answers: this.session.answers });
      this.candidates = result.candidates; this.error = result.reason ?? ''; this.step = 3; this.busy = false; this.render(); return;
    }
    if (name === 'choose') {
      const candidate = this.candidates[Number(button.dataset.index)];
      if (!candidate) return;
      this.busy = true; this.render();
      await this.editor.applyGuidedCandidate(candidate);
      this.session.candidate = { productId: candidate.productId, identity: candidate.identity, patch: candidate.patch,
        recommendationId: candidate.recommendation.id, recommendationVersion: candidate.recommendation.version,
        selectedAt: new Date().toISOString(), dimension: candidate.dimension, status: 'SELECTED_FOR_DRAFT' };
      this.session.searching = false; this.session.acknowledged = []; this.busy = false; this.notify(); this.render(); return;
    }
    if (name === 'skip') {
      const field = this.currentQuestion();
      if (field && !field.required) { this.session.acknowledged.push(field.key); this.editKey = null; this.notify(); this.render(); }
      return;
    }
    if (name === 'edit') { this.editKey = button.dataset.key; this.render(); }
  }
  currentQuestion() {
    const result = this.editor.state.resolved;
    return result?.fields.find(f => f.key === this.editKey && !f.disabled && !f.readOnly) ?? nextGuidedQuestion(result, this.session.acknowledged);
  }
  renderCandidate(candidate, index) {
    return `<article class="guided-candidate"><div class="eyebrow">商品候補</div><h3>${esc(candidate.manufacturer)} ${esc(candidate.name)}</h3>
      <p>${esc(candidate.reason)}</p><dl class="guided-comparison"><dt>価格</dt><dd>${esc(candidate.comparisons.price.label)}</dd><dt>断熱性能</dt><dd>${esc(candidate.comparisons.thermal.label)}</dd><dt>寸法</dt><dd>${esc(candidate.dimension.label)}</dd><dt>納まり</dt><dd>${esc(candidate.comparisons.installation.label)}</dd></dl>
      <p class="field-help">${esc(candidate.caution)}</p>
      <details><summary>なぜこの商品？</summary><p>希望の開閉形式と、${candidate.dimension.status === 'EXACT_STANDARD_MATCH' ? '規格実寸が一致しています。' : '正式マスターの選択肢を照合しました。寸法はこれから確認します。'}</p><p>現在の対象は1シリーズです。他シリーズとの価格・性能の優劣はまだ比較していません。</p><small>社内推薦ルール ${esc(candidate.recommendation.version)}・更新 ${esc(candidate.recommendation.updatedAt)}</small></details>
      <details><summary>顧客への説明ポイント</summary><ul>${candidate.recommendation.customerPoints.map(text => `<li>${esc(text)}</li>`).join('')}</ul></details>
      <details><summary>詳しく学ぶ</summary><p>${esc(candidate.recommendation.learn)}</p><a href="${esc(candidate.evidence.url)}" target="_blank" rel="noopener">${esc(candidate.evidence.label)}</a><p class="field-help">メーカー公式情報の参照元：${esc(candidate.evidence.source)}。社内推薦理由は商品仕様と別に管理しています。</p></details>
      ${action('choose', 'この商品で仕様を決める', `data-index="${index}"`)}</article>`;
  }
  renderSearch() {
    const answers = this.session.answers;
    const footer = `<div class="guided-actions">${this.step > 0 ? action('back', '戻る') : ''}${this.step < 2 ? action('next', '次へ') : this.step === 2 ? action('search', '候補を確認する') : action('restart', '条件を見直す')}</div>`;
    let body;
    if (this.step === 0) body = `<h3>何を選び、何を重視しますか？</h3><div class="field"><label for="guidedPurpose">用途</label><select id="guidedPurpose" data-guided-answer="purpose">${options(contract.purposes, answers.purpose)}</select></div><div class="field"><label for="guidedPriority">重視すること</label><select id="guidedPriority" data-guided-answer="priority">${options(contract.priorities, answers.priority)}</select></div><p class="field-help">希望を記録します。価格・断熱性能の順位は、比較根拠がそろうまで断定しません。</p>`;
    else if (this.step === 1) body = `<h3>どの開閉形式を希望しますか？</h3><div class="field"><label for="guidedOpening">開閉形式</label><select id="guidedOpening" data-guided-answer="opening">${options(this.openings, answers.opening)}</select></div><p class="field-help">${esc(contract.learning.OPENING)}</p>`;
    else if (this.step === 2) body = `<h3>計画している窓の実寸は分かりますか？</h3><p>規格品の実寸をmmで入力してください。不明な場合は両方を空欄にして進めます。</p><div class="form-grid"><div class="field"><label for="guidedWidth">幅 W（mm）</label><input id="guidedWidth" type="number" min="1" data-guided-answer="width" value="${esc(answers.width)}"></div><div class="field"><label for="guidedHeight">高さ H（mm）</label><input id="guidedHeight" type="number" min="1" data-guided-answer="height" value="${esc(answers.height)}"></div></div><p class="field-help">${esc(contract.learning.SIZE)} 特注と現場の納まりは別途確認します。</p>`;
    else body = this.candidates.length ? `<h3>条件を確認できる商品候補</h3><p>対象は1シリーズです。価格・性能は未確認のため、順位を付けていません。</p>${this.candidates.map((c, i) => this.renderCandidate(c, i)).join('')}` : '<h3>候補がありません</h3>';
    return body + footer;
  }
  renderQuestions() {
    const result = this.editor.state.resolved;
    const field = this.currentQuestion();
    const answered = result.fields.filter(f => result.selection[f.key] !== undefined && !f.disabled && !f.internal && !f.technical);
    const summary = `<details class="guided-answers"><summary>回答済み ${answered.length}項目を確認・変更</summary>${answered.map(f => `<div><span>${esc(f.displayLabel)}</span>${action('edit', '変更', `data-key="${esc(f.key)}"`)}</div>`).join('')}</details>`;
    if (!field) {
      const complete = !result.validation?.errors?.length && !result.validation?.missingRequiredFields?.length;
      return `<h3>${complete ? '仕様を入力しました' : '追加確認が必要です'}</h3><p>選択内容と確認事項を通常入力で確認してください。価格の未確定事項は積算依頼に残します。</p>${summary}${action('normal', '通常入力で内容を確認')}${action('restart', '商品候補を検索し直す')}`;
    }
    return `<div class="eyebrow">仕様を決める</div><h3>${esc(field.displayLabel)}を確認しましょう</h3><div id="guidedQuestion" data-question-key="${esc(field.key)}">${this.editor.renderField(field)}</div>
      <p class="field-help">${esc(contract.learning[field.semanticStage] ?? '選択肢は現在の正式商品マスターから取得しています。')}</p>${!field.required ? action('skip', '追加しない・次へ') : ''}${summary}${action('restart', '商品候補を検索し直す')}`;
  }
  render() {
    const normal = this.editor.root.querySelector('#normalProductInputs');
    const panel = this.editor.root.querySelector('#guidedPanel');
    normal.hidden = this.mode === 'guided'; panel.hidden = this.mode !== 'guided';
    this.editor.root.querySelectorAll('[data-guided-action="normal"],[data-guided-action="guided"]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.guidedAction === this.mode)));
    if (this.mode !== 'guided') return;
    let content;
    if (this.editor.state.stale) content = '<p>保存時の商品設定を保持しています。上の「現在Runtimeで再検証」を押してから案内を再開してください。</p>';
    else if (this.editor.state.productId && !this.activeProduct() && !this.session.searching) content = `<p>この商品はかんたん選定の対象外です。通常入力から仕様を確認できます。</p>${action('normal', '通常入力で内容を確認')}${action('restart', '対象商品の候補を検索')}`;
    else if (this.activeProduct() && this.editor.state.resolved && !this.session.searching) content = this.renderQuestions();
    else content = this.renderSearch();
    panel.innerHTML = `<div class="guided-heading"><div class="eyebrow">かんたん商品選定</div><p>質問に答えながら、選ぶ理由も確認できます。</p></div>${this.error ? `<p class="notice error" role="alert">${esc(this.error)}</p>` : ''}${this.busy ? '<p role="status">商品マスターを確認しています…</p>' : content}`;
  }
}
