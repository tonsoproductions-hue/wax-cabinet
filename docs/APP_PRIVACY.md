# App Store privacy checklist (owner's copy)

This is the owner's checklist for filling in App Store Connect. It is not legal advice.

## URLs

- Privacy Policy URL: `https://vinylcrate.vercel.app/privacy/`
- Support URL: `https://vinylcrate.vercel.app/support/`
- Terms of Use: `https://vinylcrate.vercel.app/terms/` (link it in the app description or use it as a custom EULA; Apple's standard EULA applies otherwise)
- Account deletion page: `https://vinylcrate.vercel.app/delete-account/`

## App Privacy ("nutrition label") answers

| Data type | Collected? | Linked to user? | Used for tracking? | Purposes |
| --- | --- | --- | --- | --- |
| Contact Info > Email Address | Yes | Yes | No | App Functionality |
| User Content > Photos or Videos (cover photos) | Yes | Yes | No | App Functionality |
| User Content > Other User Content (record collection, typed search text and hints) | Yes | Yes | No | App Functionality |
| Identifiers > User ID | Yes | Yes | No | App Functionality |
| Usage Data > Product Interaction (lookup log) | Yes | Yes | No | App Functionality only. Do NOT select Analytics. The log is used for rate limiting and cost control. |

Not collected: Location, Contacts, Health and Fitness, Financial Info, Browsing History, Search History, Diagnostics (crash and performance data), Advertising Data, Device ID, Purchases, Sensitive Info, and everything else not listed above.

Data used to track you: **None.**

## Account deletion (Guideline 5.1.1(v))

Met in-app: Settings > Delete Account, with a confirmation step. It deletes the auth user, cover photos, records, profile and lookup log. The public description page is `/delete-account/`.

## Permission strings in Info.plist

- Camera: photograph a record cover for identification (only when the user chooses to).
- Photo Library: pick an existing cover photo (only when the user chooses to).
- Motion: shake to shuffle; read on-device, never stored or sent.

## Other submission items

- Privacy manifest: `ios/App/App/PrivacyInfo.xcprivacy` exists and declares no tracking.
- Age rating: 4+.
- Export compliance: `ITSAppUsesNonExemptEncryption = false` is already set in Info.plist.

## Keep these in sync

If you add a new SDK, analytics, a new data field or a new service provider, update the privacy policy page, this file, the App Store Connect answers and the privacy manifest together.
