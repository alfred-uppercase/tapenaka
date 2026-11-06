CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type text NOT NULL,
  item_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX comments_item_idx ON public.comments(item_type, item_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY comments_read ON public.comments FOR SELECT TO authenticated USING (true);
CREATE POLICY comments_add ON public.comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY comments_remove ON public.comments FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.friendships (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, friend_id),
  CHECK (user_id <> friend_id)
);
GRANT SELECT, INSERT, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY friends_read ON public.friendships FOR SELECT TO authenticated USING (user_id = auth.uid() OR friend_id = auth.uid());
CREATE POLICY friends_add ON public.friendships FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY friends_remove ON public.friendships FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Public member info (username only) for comments, mentions and friends.
CREATE OR REPLACE FUNCTION public.item_comments(_type text, _id text)
RETURNS TABLE(id uuid, parent_id uuid, user_id uuid, username text, body text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.parent_id, c.user_id, p.username, c.body, c.created_at
  FROM public.comments c JOIN public.profiles p ON p.id = c.user_id
  WHERE auth.uid() IS NOT NULL AND c.item_type = _type AND c.item_id = _id
  ORDER BY c.created_at
$$;
CREATE OR REPLACE FUNCTION public.search_members(q text)
RETURNS TABLE(id uuid, username text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.username FROM public.profiles p
  WHERE auth.uid() IS NOT NULL AND p.username <> '' AND p.username ILIKE replace(replace(q,'%',''),'_','') || '%'
  ORDER BY p.username LIMIT 8
$$;
CREATE OR REPLACE FUNCTION public.my_friends()
RETURNS TABLE(id uuid, username text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.username FROM public.friendships f JOIN public.profiles p ON p.id = f.friend_id
  WHERE f.user_id = auth.uid() ORDER BY p.username
$$;
REVOKE EXECUTE ON FUNCTION public.item_comments(text,text), public.search_members(text), public.my_friends() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.item_comments(text,text), public.search_members(text), public.my_friends() TO authenticated;

-- Keep only the 5 most recent plays per user per week.
CREATE OR REPLACE FUNCTION public.trim_watch_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.watch_events w
  WHERE w.user_id = NEW.user_id
    AND date_trunc('week', w.viewed_at) = date_trunc('week', NEW.viewed_at)
    AND w.id NOT IN (
      SELECT x.id FROM public.watch_events x
      WHERE x.user_id = NEW.user_id AND date_trunc('week', x.viewed_at) = date_trunc('week', NEW.viewed_at)
      ORDER BY x.viewed_at DESC LIMIT 5);
  RETURN NULL;
END $$;
CREATE TRIGGER watch_events_trim AFTER INSERT ON public.watch_events FOR EACH ROW EXECUTE FUNCTION public.trim_watch_events();

DELETE FROM public.watch_events w USING (
  SELECT id, row_number() OVER (PARTITION BY user_id, date_trunc('week', viewed_at) ORDER BY viewed_at DESC) rn FROM public.watch_events
) r WHERE w.id = r.id AND r.rn > 5;