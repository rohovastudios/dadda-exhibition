# dadda? — Submission curator workflow

Standard operating procedure for reviewing, approving, and publishing participant submissions from the built-in submit form (`submit.html`).

## Intake

1. Submissions arrive via Formspree (or configured endpoint) with all mapped field names listed in `submit.html` / `README.md`.
2. Log each submission in the editorial tracker with date, participant ID, and review status: **Received → In review → Approved / Declined / Needs follow-up**.

## Privacy review (required before any public use)

### Children in text

- Redact or anonymize children's full names, schools, addresses, and other identifying details unless the participant explicitly consented to publication as written.
- Prefer age ranges over exact ages when publishing.

### Children in images — **manual face blur required**

If a submission includes uploaded images (`supporting_images[]`) that contain a child or children:

1. **Do not publish the original file.**
2. Open the image in an editor (Photoshop, Pixelmaker, etc.).
3. **Manually blur each child's face** (or silhouette/crop per project privacy policy) until the child is not identifiable.
4. Save the obscured version as the **publishable master**; retain the original only in secure, access-controlled storage if needed for legal/archive purposes.
5. Document in the tracker: `child_faces_blurred: yes`, editor initials, date.
6. Only after blur/obscuring is complete may the image move to **Approved for publish**.

This step is mandatory even when the participant has checked the consent boxes — consent covers permission to use the material; curators are responsible for obscuring minors before public display.

### Other individuals in images

- Apply the same obscuring standards (crop, blur, silhouette) for anyone other than the submitting participant who has not given separate consent.

## Editorial approval checklist

Before marking **Approved for publish**:

- [ ] Contact info verified; anonymity preference honored (`remain_anonymous`, `preferred_name`).
- [ ] All required consents present (steps 6–7 fields).
- [ ] Signature recorded (`signature`, optional `signature_image`).
- [ ] Text edited only with participant notification if changes are substantive.
- [ ] **All child faces in images manually blurred** (see above).
- [ ] Final caption/credit line matches participant's name preference.

## Follow-up interviews

- Check `follow_up_interview[]` responses.
- If participant opted in, route to interview coordinator; do not cold-call without matching their stated preference (video, phone, email first).

## Declined / withdrawn

- Do not use materials in any public channel.
- Archive internal copy per project retention policy.
