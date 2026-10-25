export type TemplateVars = Record<string, string>;

/**
 * Replace `$KEY` tokens in a template with their values.
 * Every occurrence of each token is replaced.
 * @param template Template string, e.g. `$BASE_NAME ⇄ $REF_NAME`
 * @param vars Map of token names (without `$`) to values
 */
export function formatTemplate(template: string, vars: TemplateVars): string {
    return template.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (token, key: string) =>
        Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : token,
    );
}
