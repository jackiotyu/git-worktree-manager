export type TemplateVars = Record<string, string>;

/**
 * Replace `$KEY` tokens in a template with their values.
 * Every occurrence of each token is replaced.
 * @param template Template string, e.g. `$BASE_NAME ⇄ $REF_NAME`
 * @param vars Map of token names (without `$`) to values
 */
export function formatTemplate(template: string, vars: TemplateVars): string {
    return Object.entries(vars).reduce((text, [key, value]) => text.split(`$${key}`).join(value), template);
}
