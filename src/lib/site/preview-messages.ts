/** Messages between the website editor and its preview iframe (same origin only). */
export const PREVIEW_MESSAGES = {
  /** preview → editor: a section was clicked ({ id }) */
  select: "site-editor:select",
  /** editor → preview: re-render with the latest draft */
  refresh: "site-editor:refresh",
  /** editor → preview: outline and scroll to a section ({ id }) */
  focus: "site-editor:focus",
  /** preview → editor: the preview is listening */
  ready: "site-editor:ready",
  /** preview → editor: "+" between sections ({ index }) */
  insert: "site-editor:insert",
  /** preview → editor: undo/redo pressed inside the preview ({ key: "undo" | "redo" }) */
  key: "site-editor:key",
  /** preview → editor: text typed on the page ({ id, path, value }) */
  edit: "site-editor:edit",
  /** preview → editor: typing on the page stopped */
  editEnd: "site-editor:edit-end",
  /** preview → editor: open a field in the panel ({ id, path }) */
  focusField: "site-editor:focus-field",
} as const;
