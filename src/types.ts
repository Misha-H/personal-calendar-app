/**
 * @remarks
 * Given:
 * ```html
 * <form>
 *   <input type='text' name="event-date" value='Hello' />
 *   <input type='text' name="event-title" value='World!' />
 * </form>
 * ```
 *
 * Extend `HTMLFormElement` to include HTML `<form>` inputs.
 *
 * @example
 * From: `HTMLFormElement`:
 * ```ts
 * {
 *   elements: {};
 * }
 * ```
 *
 * To: `AddEventFormElement`:
 * ```ts
 * {
 *   elements: {
 *     'event-date': HTMLInputElement;
 *     'event-title': HTMLInputElement;
 *   },
 * }
 * ```
 */
export interface AddEventFormElement<T> extends HTMLFormElement {
  elements: T & HTMLFormControlsCollection;
}

export interface User {
  id: string;
  username: string;
  password: string;
}
