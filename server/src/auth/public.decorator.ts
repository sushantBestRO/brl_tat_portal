import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// ─── Marks a route (or a whole controller) as not requiring a JWT ───
// Usage: @Public()  above a route, or above the whole @Controller class.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
