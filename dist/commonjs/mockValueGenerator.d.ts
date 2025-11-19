interface MockValueGenerator {
    dynamicValues: boolean;
    word: () => string;
    uuid: () => string;
    boolean: () => boolean | string;
    integer: () => number | string;
    float: () => number | string;
    date: () => string;
    seed: (seed: number) => void;
}
type FunctionTokens = Record<'import' | 'seed' | 'seedFunction', string>;
type SetupMockValueGeneratorOptions = {
    generateLibrary: 'casual' | 'faker';
    generatorLocale: string;
    dynamicValues: boolean;
};
export declare const setupMockValueGenerator: ({ generateLibrary, dynamicValues, generatorLocale, }: SetupMockValueGeneratorOptions) => MockValueGenerator;
export declare const setupFunctionTokens: (generateLibrary: "casual" | "faker", locale?: string) => FunctionTokens;
export {};
