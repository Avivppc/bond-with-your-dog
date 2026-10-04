import { blocks } from "./shared";

/**
 * The accessibility statement (Israeli Equal Rights for Persons with Disabilities Regulations 2013,
 * reg. 35). Only say here what is true: update it after each accessibility review.
 */
export const ACCESSIBILITY_HTML = blocks(
  "<p>Bonded wants everyone to be able to learn with their dog, including people with disabilities. We aim for our website and member app to meet the Israeli Standard 5568 and the Web Content Accessibility Guidelines (WCAG) at level AA.</p>",
  "{{business_details}}",

  "<h2>What we do</h2>",
  "<ul>",
  "<li>We build pages with headings, lists and labelled form fields so screen readers can follow them.</li>",
  "<li>We design the site and the member area to be usable with a keyboard.</li>",
  "<li>We add a text description to images that carry meaning.</li>",
  "<li>Text can be enlarged in the browser, and we aim for readable colour contrast.</li>",
  "</ul>",

  "<h2>Known limits</h2>",
  "<ul>",
  "<li>Not every lesson video has captions or a transcript yet. If you need one for a lesson you bought, write to us and we will provide it.</li>",
  "<li>Some downloadable PDFs may not be fully accessible to screen readers.</li>",
  "<li>Videos members upload, and posts in the community, are written by members and may not be accessible.</li>",
  "<li>Third-party parts such as the payment page, the video player and the sign-in with Google are run by their providers.</li>",
  "</ul>",

  "<h2>Ask us for help or tell us about a problem</h2>",
  "<p>If something on Bonded isn&#39;t accessible to you, or you need content in another format, please tell us and we will do our best to help or to give you the content another way, usually within a few business days. Email <a href=\"mailto:{{contact_email}}\">{{contact_email}}</a> and say what page you were on and what happened. Our accessibility contact is the business named above.</p>",
  "<p>This statement was last reviewed on the date shown above.</p>",
);
