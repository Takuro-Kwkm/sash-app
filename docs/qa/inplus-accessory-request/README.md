# Inplus sales accessory requests — Additional Requirements 15–18

NON-PRODUCT-MASTER continuation of PR #56 from afb59c956e00e88042df87ca1507423e054d5431. Business scope: sales estimate request. No merge, production release, shared schema migration, Formal Master/Runtime/Registry mutation.

Authority retrieved: Current Information Source Manifest v1.5; Runtime UI v1.8; Sash UI Standard v2.1; Common Product App Standard v2.0; Sales QA_READY Boundary v1.1; Estimate Output v1.1; APP_CHANGE_GUARDRAIL v1.1; Current Registry entries for Inplus v0.4-R3, Bathroom v1.0, Uchirimo R6. CURRENT_RELEASE_MANIFEST was read and identifies the interior app baseline, so it is not used as the sash implementation baseline. The explicitly requested existing sash PR #56 candidate is continued; prior bathroom workflow separation remains intact.

The existing inner-window Sales Request Extension projects a single option_items MULTI_ENUM after manufacturer/product evaluation. Both requested accessory IDs are stripped before product resolution, then their valid sales intent is restored into the resolved selection. No manufacturer adapter receives cross-manufacturer accessory facts. Both standard and bathroom specifications receive the same two existing-outer-window requests:

| ID | Label | Applicability |
|---|---|---|
| OP-REPLACEMENT-CRESCENT | 外窓用 交換用クレセント（汎用クレセント） | Inplus sales estimate, both variants; existing ID reused |
| OP-YKKAP-GENERIC-HANDLE | 外窓用 汎用ハンドル（YKK AP製） | Inplus sales estimate, both variants |

The bathroom adapter exposes no Formal product checkbox options; its projected list therefore contains exactly those two requests. Standard product options and the other existing sales augmentations continue to use their current eligibility evaluation; they are never copied to bathroom. Upstream changes re-evaluate product options while retaining explicit outer-window accessory intent.

Handoff uses existing sales_request_handoff metadata with additional_option_items and additional_accessory_requests. Each request carries EXISTING_OUTER_WINDOW, ESTIMATE_CONFIRM_REQUIRED, auto_resolved=false, confirmation contact and compatibility/installation/part-number question. Handle metadata identifies manufacturer=YKK AP and source_product=CROSS_MANUFACTURER_ACCESSORY. Replacement manufacturer remains unspecified rather than inferred. Corresponding confirmation_requests and Japanese display_summary feed the existing common estimate output model, PDF, Excel and print renderers.

Verification: tests/92 and the actual-checkbox browser suite cover both variants, simultaneous selection, persisted snapshot/reload, output labels, confirmation attribution, clear, duplicate/unknown filtering, variant switching and preservation of existing Formal prohibition. Browser evidence records current option lists and 1280/768/390 screenshots. Existing window-flow CI remains enabled and runs the new browser suite before downstream regression. Exact-head CI/Preview results must be read from their runs/artifacts; this document does not predeclare them.
