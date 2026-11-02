CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, role public.app_role NOT NULL, UNIQUE (user_id, role));
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
CREATE POLICY roles_read_own ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.user_presence (user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE, last_seen timestamptz NOT NULL DEFAULT now(), current_item jsonb, page text);
GRANT SELECT, INSERT, UPDATE ON public.user_presence TO authenticated;
GRANT ALL ON public.user_presence TO service_role;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY presence_read ON public.user_presence FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY presence_insert ON public.user_presence FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY presence_update ON public.user_presence FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY profiles_admin_read ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY views_admin_read ON public.watch_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.admin_top_titles(days integer) RETURNS TABLE(item jsonb, viewers bigint, plays bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (array_agg(w.item ORDER BY w.viewed_at DESC))[1], count(DISTINCT w.user_id), count(*)
  FROM public.watch_events w
  WHERE public.has_role(auth.uid(),'admin') AND w.viewed_at > now() - make_interval(days => greatest(1, least(days, 365)))
  GROUP BY w.item_type, w.item_id ORDER BY 2 DESC, 3 DESC LIMIT 20 $$;

CREATE OR REPLACE FUNCTION public.admin_users() RETURNS TABLE(id uuid, username text, email text, created_at timestamptz, last_seen timestamptz, current_item jsonb, is_admin boolean, plays bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.username, u.email::text, p.created_at, pr.last_seen, pr.current_item, public.has_role(p.id,'admin'),
    (SELECT count(*) FROM public.watch_events w WHERE w.user_id = p.id)
  FROM public.profiles p JOIN auth.users u ON u.id = p.id LEFT JOIN public.user_presence pr ON pr.user_id = p.id
  WHERE public.has_role(auth.uid(),'admin') ORDER BY pr.last_seen DESC NULLS LAST $$;
REVOKE EXECUTE ON FUNCTION public.admin_users() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_top_titles(integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_top_titles(integer) TO authenticated;