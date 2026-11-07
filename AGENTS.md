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

- Discovery and detail pages live under the client-only `_public` layout (guests allowed); account pages stay under `_authenticated`. Server functions use optionalSupabaseAuth or requireSupabaseAuth and the watch proxy checks member player paths itself, because UI gating does not protect endpoints.
- Player link templates live in app_settings (player_member_*/player_guest_*) and are resolved server-side so the proxy only serves paths matching a configured template.
- Enrich the current upstream catalogue with detail metadata in bounded batches because the home API omits genre and year.
- Store profiles, private favorites and watch events in Cloud; rank distinct film viewers over rolling seven-day and thirty-day periods to avoid repeated-click inflation.
- Set a short-lived HttpOnly same-origin watch cookie after an authenticated action because iframe requests cannot attach the app bearer header.
- Upstream API origin is read from app_settings (key api_origin) on every server call so admins can switch domains without a deploy.
- Render mobile navigation through the shared portal-based Sheet so sticky-header effects cannot clip the drawer; Radix manages focus and scroll locking.
- Use the shared PageLoading component for router pending screens and root navigation feedback so all page loaders share accessible loading feedback.
