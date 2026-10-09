import { blogResponse } from '../../lib/blog-cache.mjs';
export const onRequestGet = context => blogResponse(context.env.BLOG_CACHE);
