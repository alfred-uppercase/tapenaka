<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep viewing and discovery pages under the client-only authenticated layout; server functions and the watch proxy validate auth independently because UI gating does not protect endpoints.
- Enrich the current upstream catalogue with detail metadata in bounded batches because the home API omits genre and year.
- Store profiles, private favorites and watch events in Cloud; rank distinct film viewers over rolling seven-day and thirty-day periods to avoid repeated-click inflation.
- Set a short-lived HttpOnly same-origin watch cookie after an authenticated action because iframe requests cannot attach the app bearer header.
- Upstream API origin is read from app_settings (key api_origin) on every server call so admins can switch domains without a deploy.
- Render mobile navigation through the shared portal-based Sheet so sticky-header effects cannot clip the drawer; Radix manages focus and scroll locking.
- Use the shared PageLoading component for router pending screens and root navigation feedback so all page loaders share accessible loading feedback.
