import { useState } from 'react';

/**
 * Controls a menu whose content is fetched on demand: asking to open it
 * starts the fetch (`requested`), and it only opens once `ready`, showing
 * `loading` in the meantime.
 */
export function useOpenWhenReady() {
  const [wantsOpen, setWantsOpen] = useState(false);
  const [requested, setRequested] = useState(false);

  function onOpenChange(open: boolean) {
    setWantsOpen(open);
    if (open) setRequested(true);
  }

  function stateFor(ready: boolean) {
    return {
      open: wantsOpen && ready,
      loading: wantsOpen && !ready,
      onOpenChange,
    };
  }

  return { requested, stateFor };
}
