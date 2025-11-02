-- Add foreign key from game_scores to profiles
ALTER TABLE public.game_scores 
  DROP CONSTRAINT IF EXISTS game_scores_user_id_fkey,
  ADD CONSTRAINT game_scores_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;