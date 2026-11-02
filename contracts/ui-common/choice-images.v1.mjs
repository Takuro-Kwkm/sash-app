// App-owned display setting for new Sash UI integrations; never product facts.
export const NEW_SASH_CHOICE_IMAGES = 'MODAL_ON_DEMAND';
export function choiceImagePresentation(mode=NEW_SASH_CHOICE_IMAGES){
  if(!['MODAL_ON_DEMAND','INLINE'].includes(mode))throw new Error('CHOICE_IMAGE_PRESENTATION_INVALID');
  return Object.freeze({mode});
}
