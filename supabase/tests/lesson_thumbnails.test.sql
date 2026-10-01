-- Custom lesson thumbnails: an uploaded image always wins over the Vimeo thumbnail.
\set ON_ERROR_STOP 1

insert into public.courses (id, title, description, level, category, price, published)
  values ('thumb-course', 'Thumbnail course', 'd', 'Beginner', 'Foundations', 0, true);
insert into public.modules (id, course_id, title, position, published)
  values ('c0000000-0000-0000-0000-0000000000f1', 'thumb-course', 'M', 1, true);
insert into public.lessons (id, course_id, module_id, position, title, thumbnail_url) values
  ('d0000000-0000-0000-0000-0000000000f1', 'thumb-course', 'c0000000-0000-0000-0000-0000000000f1', 1, 'With video',
   'https://i.vimeocdn.com/video/1.jpg'),
  ('d0000000-0000-0000-0000-0000000000f2', 'thumb-course', 'c0000000-0000-0000-0000-0000000000f1', 2, 'No video', null);
insert into public.lesson_videos (lesson_id, provider, external_id, thumbnail_url)
  values ('d0000000-0000-0000-0000-0000000000f1', 'vimeo', '1', 'https://i.vimeocdn.com/video/1.jpg');

-- Uploading sets the thumbnail members see.
update public.lessons set thumbnail_upload_url = 'https://cdn.test/course-images/lessons/a.jpg'
 where id = 'd0000000-0000-0000-0000-0000000000f1';
select t.ok((select thumbnail_url from public.lessons where id = 'd0000000-0000-0000-0000-0000000000f1')
            = 'https://cdn.test/course-images/lessons/a.jpg', 'an upload becomes the lesson thumbnail');

-- Saving the video again (which syncs the Vimeo thumbnail) keeps the upload.
update public.lesson_videos set thumbnail_url = 'https://i.vimeocdn.com/video/2.jpg'
 where lesson_id = 'd0000000-0000-0000-0000-0000000000f1';
update public.lessons set thumbnail_url = 'https://i.vimeocdn.com/video/2.jpg', duration_seconds = 90
 where id = 'd0000000-0000-0000-0000-0000000000f1';
select t.ok((select thumbnail_url from public.lessons where id = 'd0000000-0000-0000-0000-0000000000f1')
            = 'https://cdn.test/course-images/lessons/a.jpg', 'a video save never overwrites an uploaded thumbnail');
select t.ok((select duration_seconds from public.lessons where id = 'd0000000-0000-0000-0000-0000000000f1') = 90,
            'other video metadata still syncs');

-- Replacing the upload switches to the new image.
update public.lessons set thumbnail_upload_url = 'https://cdn.test/course-images/lessons/b.jpg'
 where id = 'd0000000-0000-0000-0000-0000000000f1';
select t.ok((select thumbnail_url from public.lessons where id = 'd0000000-0000-0000-0000-0000000000f1')
            = 'https://cdn.test/course-images/lessons/b.jpg', 'a replaced upload is shown');

-- Removing the upload falls back to the current Vimeo thumbnail.
update public.lessons set thumbnail_upload_url = null where id = 'd0000000-0000-0000-0000-0000000000f1';
select t.ok((select thumbnail_url from public.lessons where id = 'd0000000-0000-0000-0000-0000000000f1')
            = 'https://i.vimeocdn.com/video/2.jpg', 'removing the upload falls back to the Vimeo thumbnail');

-- Without a video, removing the upload leaves no thumbnail.
update public.lessons set thumbnail_upload_url = 'https://cdn.test/course-images/lessons/c.jpg'
 where id = 'd0000000-0000-0000-0000-0000000000f2';
update public.lessons set thumbnail_upload_url = null where id = 'd0000000-0000-0000-0000-0000000000f2';
select t.ok((select thumbnail_url from public.lessons where id = 'd0000000-0000-0000-0000-0000000000f2') is null,
            'no video and no upload means no thumbnail');

-- A lesson inserted with an upload (e.g. a duplicate) shows it.
insert into public.lessons (id, course_id, module_id, position, title, thumbnail_url, thumbnail_upload_url)
  values ('d0000000-0000-0000-0000-0000000000f3', 'thumb-course', 'c0000000-0000-0000-0000-0000000000f1', 3, 'Copy',
          'https://i.vimeocdn.com/video/2.jpg', 'https://cdn.test/course-images/lessons/d.jpg');
select t.ok((select thumbnail_url from public.lessons where id = 'd0000000-0000-0000-0000-0000000000f3')
            = 'https://cdn.test/course-images/lessons/d.jpg', 'inserting with an upload uses it');

select t.fails_with($$update public.lessons set thumbnail_upload_url = 'javascript:alert(1)'
                      where id = 'd0000000-0000-0000-0000-0000000000f2'$$,
                    '23514', 'only http(s) thumbnail URLs');

-- Members can read the thumbnail columns but not write them.
set role authenticated;
select t.ok((select count(*) from public.lessons where course_id = 'thumb-course' and thumbnail_upload_url is not null) = 1,
            'members can read the upload column');
select t.denied($$update public.lessons set thumbnail_upload_url = null$$, 'members cannot change thumbnails');
reset role;
