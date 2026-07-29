import { defineField, defineType } from "sanity";

export const submission = defineType({
  name: "submission",
  title: "Submission",
  type: "document",
  fields: [
    defineField({
      name: "status",
      title: "Review status",
      type: "string",
      options: {
        list: [
          { title: "Received", value: "received" },
          { title: "In review", value: "in_review" },
          { title: "Approved", value: "approved" },
          { title: "Declined", value: "declined" },
          { title: "Needs follow-up", value: "needs_follow_up" },
        ],
        layout: "radio",
      },
      initialValue: "received",
    }),
    defineField({
      name: "submittedAt",
      title: "Submitted at",
      type: "datetime",
      readOnly: true,
    }),
    defineField({
      name: "formspreeId",
      title: "Formspree submission ID",
      type: "string",
      readOnly: true,
    }),
    defineField({ name: "fullLegalName", title: "Full legal name", type: "string" }),
    defineField({ name: "preferredName", title: "Preferred name", type: "string" }),
    defineField({ name: "email", title: "Email", type: "string" }),
    defineField({ name: "phone", title: "Phone", type: "string" }),
    defineField({ name: "countryOfResidence", title: "Country of residence", type: "string" }),
    defineField({ name: "preferredContactMethod", title: "Preferred contact method", type: "string" }),
    defineField({ name: "remainAnonymous", title: "Remain anonymous", type: "string" }),
    defineField({
      name: "fatherhoodRelationship",
      title: "Fatherhood relationship",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({ name: "childrenInfo", title: "Children info", type: "text" }),
    defineField({ name: "response1Prompt", title: "Response 1 prompt", type: "string" }),
    defineField({ name: "response1", title: "Response 1", type: "text" }),
    defineField({ name: "response2Prompt", title: "Response 2 prompt", type: "string" }),
    defineField({ name: "response2", title: "Response 2", type: "text" }),
    defineField({ name: "response3Prompt", title: "Response 3 prompt", type: "string" }),
    defineField({ name: "response3", title: "Response 3", type: "text" }),
    defineField({
      name: "supportingImages",
      title: "Supporting images (original uploads)",
      type: "array",
      of: [{ type: "image", options: { hotspot: true } }],
    }),
    defineField({
      name: "followUpInterview",
      title: "Follow-up interview preferences",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({ name: "signature", title: "Signature (typed)", type: "string" }),
    defineField({ name: "signatureType", title: "Signature type", type: "string" }),
    defineField({
      name: "signatureImage",
      title: "Signature image",
      type: "image",
    }),
    defineField({
      name: "curatorNotes",
      title: "Curator notes",
      type: "text",
    }),
    defineField({
      name: "childFacesBlurred",
      title: "Child faces blurred for publish",
      type: "boolean",
      initialValue: false,
    }),
  ],
  preview: {
    select: {
      title: "preferredName",
      subtitle: "fullLegalName",
      status: "status",
    },
    prepare({ title, subtitle, status }) {
      return {
        title: title || subtitle || "Submission",
        subtitle: status || "received",
      };
    },
  },
});
