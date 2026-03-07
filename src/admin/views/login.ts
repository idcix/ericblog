import { escapeHtml } from "@/lib/security";

interface LoginPageOptions {
	error?: string;
	githubLogin?: string;
	oauthEnabled?: boolean;
}

export function loginPage(options: LoginPageOptions = {}): string {
	const { error, githubLogin, oauthEnabled = false } = options;

	return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>GitHub OAuth 登录</title>
	<meta name="robots" content="noindex, nofollow" />
	<style>
		*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
		html {
			font-family: system-ui, -apple-system, sans-serif;
			font-size: 14px;
			color: #f1f5f9;
			background: #0f172a;
		}
		body {
			min-height: 100dvh;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 1.5rem;
		}
		.login-card {
			width: 100%;
			max-width: 420px;
			padding: 2rem;
			background: #1e293b;
			border: 1px solid #334155;
			border-radius: 0.75rem;
			display: grid;
			gap: 1rem;
		}
		h1 {
			font-size: 1.5rem;
			text-align: center;
		}
		.login-hint {
			color: #cbd5e1;
			font-size: 0.92rem;
			line-height: 1.8;
			text-align: center;
		}
		.login-notice {
			background: rgba(59, 130, 246, 0.12);
			color: #bfdbfe;
			padding: 0.85rem 0.95rem;
			border-radius: 0.5rem;
			border: 1px solid rgba(59, 130, 246, 0.24);
			font-size: 0.88rem;
			line-height: 1.7;
		}
		.oauth-button {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			gap: 0.65rem;
			width: 100%;
			padding: 0.85rem 1rem;
			background: #111827;
			border: 1px solid rgba(255, 255, 255, 0.12);
			border-radius: 0.5rem;
			color: #fff;
			font-weight: 600;
			text-decoration: none;
			transition: transform 160ms ease, background-color 160ms ease, border-color 160ms ease;
		}
		.oauth-button:hover {
			background: #0b1220;
			border-color: rgba(96, 165, 250, 0.4);
			transform: translateY(-1px);
			color: #fff;
		}
		.oauth-button[aria-disabled="true"] {
			opacity: 0.55;
			pointer-events: none;
		}
		.oauth-mark {
			font-size: 1rem;
			line-height: 1;
		}
		.error {
			background: rgba(239, 68, 68, 0.1);
			color: #ef4444;
			padding: 0.625rem;
			border-radius: 0.5rem;
			font-size: 0.85rem;
			text-align: center;
			border: 1px solid rgba(239, 68, 68, 0.2);
		}
	</style>
</head>
<body>
	<div class="login-card">
		<h1>使用 GitHub 登录后台</h1>
		<p class="login-hint">后台仅允许指定 GitHub 账号通过 OAuth 登录喵</p>
		${error ? `<div class="error">${escapeHtml(error)}</div>` : ""}
		<div class="login-notice">
			<p>允许访问的 GitHub 账号：${escapeHtml(githubLogin || "未配置")}</p>
			<p>如果这里还是未配置状态，请先补充 GitHub OAuth 环境变量喵</p>
		</div>
		<a
			href="/api/auth/github"
			class="oauth-button"
			aria-disabled="${oauthEnabled ? "false" : "true"}"
		>
			<span class="oauth-mark">GitHub</span>
			<span>使用 GitHub OAuth 登录</span>
		</a>
	</div>
</body>
</html>`;
}
