import { blocks } from "./shared";

/** The Terms of Service. Statements about checkout and cancellation must match refund.ts and the product. */
export const TERMS_HTML = blocks(
  "<p>These terms are an agreement between you and the business below (“we”, “us”) that governs your use of the Bonded website, app and online courses. By creating an account, buying or using the service you agree to them. If you don&#39;t agree, please don&#39;t use Bonded.</p>",
  "{{business_details}}",

  "<h2>Who can use Bonded</h2>",
  "<p>You must be at least 18 years old, or the age of majority where you live, to create an account or buy. If you join with a dog in your care, you are responsible for that dog and for how you handle it.</p>",

  "<h2>Your account</h2>",
  "<p>Give us accurate information and keep your password safe. Your account is personal: please don&#39;t share your login. You are responsible for what happens under your account. Tell us at once if you think someone else has used it. You can delete your account at any time in Settings.</p>",

  "<h2>What Bonded offers</h2>",
  "<p>Bonded is an online academy by Roni Sagi. It offers video courses (“chapters”) and downloadable materials, practice and planning tools, a Moves library, personal feedback from Roni on videos you send, a community, a quiz, and an AI assistant. What is included is described on the page where you buy. Courses are educational content delivered electronically; nothing is shipped.</p>",

  "<h2>Prices, payment and receipts</h2>",
  "<p>Prices and the currency are shown before you pay. The price you see is the price you pay, including value-added tax (VAT) where it applies. Payment is by card through <strong>PayPlus</strong>, our payment provider. Your card details go to PayPlus and we never see or store them. You will receive a confirmation email and a receipt or tax invoice for each payment. If a payment fails or is reversed, we may pause access until it is resolved.</p>",

  "<h2>When you get access</h2>",
  "<p>Access starts immediately after your payment is confirmed. Chapters bought as one-time purchases include access for as long as that chapter is offered on Bonded. If we ever stop offering a chapter you bought, we will tell you in advance and give you a reasonable time to finish it. Some offers have a stated end date; the offer says so.</p>",

  "<h2>Memberships and renewals</h2>",
  "<p>A membership gives access while it is active and renews automatically each month or year, as the offer states, until you cancel. The price, the billing period and the renewal date are shown before you pay and in your receipt. You can cancel at any time under <strong>Membership &amp; purchases → Cancel subscription</strong> in your account, or by email. Cancelling stops future charges, and you keep access until the end of the period you already paid for. For plans longer than a month we email you before a renewal. See our <a href=\"/refund-policy\">Refund Policy</a> for your right to cancel and for refunds.</p>",

  "<h2>Your licence to the content</h2>",
  "<p>Everything in Bonded (videos, lessons, PDFs, music, designs, the Bonded name and logo) belongs to us or our licensors. When you buy or join we give you a personal, non-exclusive, non-transferable licence to use it for your own training of your own dogs. Please don&#39;t copy, record, resell, share or publish courses or materials, don&#39;t share your login, and don&#39;t use them to train AI systems.</p>",

  "<h2>What you share with us</h2>",
  "<p>You keep ownership of the videos, photos, posts and other content you upload. You give us a non-exclusive, worldwide, royalty-free licence to store, play, review and display it as needed to run Bonded: to give you feedback, to show posts in the community, and, for anything you choose to make public, to show it on the site. You can delete your content or your account whenever you like. We won&#39;t use your private videos in our marketing without asking you first.</p>",
  "<p>You promise that you own what you upload or have the right to share it, that it doesn&#39;t break the law or anyone&#39;s rights, and that anyone who appears in it has agreed. Please don&#39;t film children or neighbours, and remember a video can show your home. We may review, hide or remove content that breaks these terms or the community rules, and may close accounts that do. If you believe something on Bonded infringes your copyright or other rights, email <a href=\"mailto:{{contact_email}}\">{{contact_email}}</a> with the details and we will look at it promptly.</p>",

  "<h2>Community rules</h2>",
  "<p>Be kind. No harassment, hate, threats, spam, adverts, personal information about others, or advice that puts a dog at risk. Public videos and posts may be reviewed before they appear.</p>",

  "<h2>Dog training involves risk</h2>",
  "<p>Bonded is general educational guidance. It is not veterinary advice and it is not a behaviour assessment of your dog. Training around dogs carries risk, including bites and injuries to you, other people and animals. You are responsible for judging whether an exercise is safe for your dog, your space and the people around you, and for your dog&#39;s health. See a vet if your dog is in pain, unwell or has mobility problems, and get in-person help from a qualified professional if your dog is aggressive or fearful. Results vary with each dog and we don&#39;t guarantee any particular outcome.</p>",

  "<h2>AI assistant</h2>",
  "<p>The AI assistant is software. It can be wrong. Check anything important, and don&#39;t rely on it for medical, veterinary or legal decisions. Your messages are sent to our AI provider as described in the <a href=\"/privacy\">Privacy Policy</a>.</p>",

  "<h2>Using Bonded properly</h2>",
  "<p>Don&#39;t try to break, overload or get around the security of the service, copy it with automated tools, reverse-engineer it, or use it for anything unlawful. We may suspend or end access for serious or repeated breaches of these terms; where we end your access for something that wasn&#39;t your fault we will refund what you paid for the unused period.</p>",

  "<h2>Availability and changes to the service</h2>",
  "<p>We work to keep Bonded running but can&#39;t promise it will always be available or error-free. We may improve, change or remove features, and may update course content. We will not remove something you paid for without the notice described above.</p>",

  "<h2>Our responsibility</h2>",
  "<p>Nothing in these terms limits liability that the law does not allow us to limit, including liability for death or personal injury caused by our negligence, for fraud, or for intentional wrongdoing, and nothing limits the rights you have as a consumer under the law where you live (including, in Australia, the consumer guarantees under the Australian Consumer Law). Subject to that, we are not responsible for indirect or consequential loss, or for loss caused by something outside our reasonable control, and our total liability to you for anything related to Bonded is limited to the amount you paid us in the 12 months before the claim arose.</p>",

  "<h2>Ending the agreement</h2>",
  "<p>You can stop using Bonded and delete your account at any time. Sections that by their nature should continue (such as ownership of content, risk and liability) continue after the agreement ends.</p>",

  "<h2>Changes to these terms</h2>",
  "<p>We may update these terms, for example when we add features. We will post the new date above and tell you by email or in the app about changes that matter. If you keep using Bonded after a change takes effect, you accept it. A change never reduces what you already paid for.</p>",

  "<h2>Law and disputes</h2>",
  "<p>These terms are governed by the laws of the State of Israel, and the competent courts in Israel will hear disputes about them. If you are a consumer, this does not take away mandatory consumer protections of the country where you live, or your right to bring a claim in the courts there where the law gives you that right. Please contact us first at <a href=\"mailto:{{contact_email}}\">{{contact_email}}</a>; most problems can be fixed quickly.</p>",

  "<h2>The rest</h2>",
  "<p>These terms, with the <a href=\"/privacy\">Privacy Policy</a> and <a href=\"/refund-policy\">Refund Policy</a>, are the whole agreement between us about Bonded. If a part is found unenforceable, the rest still applies. If we don&#39;t enforce a term straight away, that doesn&#39;t mean we give it up.</p>",
);
