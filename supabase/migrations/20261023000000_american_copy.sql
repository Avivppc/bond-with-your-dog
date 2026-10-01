-- Copy fixes for seeded text members see. Each update only touches the original wording, so
-- anything Roni already edited in the admin stays as she wrote it.

-- American English: the badge said "Practised".
update public.achievement_defs
   set description = 'Practiced six days in a row.'
 where code = 'rhythm_6' and description = 'Practised six days in a row.';

-- One case style in the badges grid (sentence case, like "First practice" and "6-day rhythm").
update public.achievement_defs set title = 'First dance'     where code = 'first_lesson'    and title = 'First Dance';
update public.achievement_defs set title = 'Chapter champion' where code = 'course_complete' and title = 'Course Champion';
update public.achievement_defs set title = 'Warming up'      where code = 'three_lessons'   and title = 'Warming Up';
update public.achievement_defs set title = 'On the beat'     where code = 'ten_lessons'     and title = 'On the Beat';

-- Members go through chapters (Foundations → Moves → Let's Dance), not "courses".
update public.achievement_defs
   set description = 'Completed an entire chapter.'
 where code = 'course_complete' and description = 'Completed an entire course.';

-- The app speaks of Roni, not "the coaches".
update public.community_channels
   set description = 'Questions for Roni and the community.'
 where slug = 'qa' and description = 'Questions for the coaches and the community.';
