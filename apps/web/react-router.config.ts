import type { Config } from '@react-router/dev/config';

export default {
	appDirectory: './src/app',
	// Server-side render on request. Prerendering is deliberately NOT enabled:
	// this app's content is fully dynamic (students, sessions and videos all
	// come from the database at request time), and prerendering would execute
	// the server bundle during `react-router build` — before Render has
	// mounted the persistent disk — which breaks the build.
	ssr: true,
} satisfies Config;
