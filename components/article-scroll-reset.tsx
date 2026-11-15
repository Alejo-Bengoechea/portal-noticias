'use client';

import { useLayoutEffect } from 'react';

export function ArticleScrollReset({ slug }: { slug: string }) {
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  return null;
}
