import { shopResponse } from '../../lib/shop-cache.mjs';
export const onRequestGet = ({ env }) => shopResponse(env.BLOG_CACHE);
