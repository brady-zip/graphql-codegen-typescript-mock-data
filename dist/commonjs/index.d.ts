import { PluginFunction } from '@graphql-codegen/plugin-helpers';
type NamingConvention = 'change-case-all#pascalCase' | 'keep' | string;
type GeneratorName = keyof Casual.Casual | keyof Casual.functions | string;
type GeneratorDefinition = {
    generator: GeneratorName;
    arguments: unknown;
    extra?: {
        function: string;
        arguments?: unknown[] | unknown;
    };
};
type GeneratorOptions = GeneratorName | GeneratorDefinition;
type InputOutputGeneratorOptions = {
    input: GeneratorOptions;
    output: GeneratorOptions;
};
type ScalarMap = {
    [name: string]: GeneratorOptions | InputOutputGeneratorOptions;
};
type TypeFieldMap = {
    [typeName: string]: {
        [fieldName: string]: GeneratorOptions;
    };
};
export interface TypescriptMocksPluginConfig {
    typesFile?: string;
    enumValues?: NamingConvention;
    typeNames?: NamingConvention;
    addTypename?: boolean;
    prefix?: string;
    scalars?: ScalarMap;
    terminateCircularRelationships?: boolean | 'immediate';
    typesPrefix?: string;
    enumsPrefix?: string;
    transformUnderscore?: boolean;
    listElementCount?: number;
    dynamicValues?: boolean;
    generateLibrary?: 'casual' | 'faker';
    fieldGeneration?: TypeFieldMap;
    locale?: string;
    enumsAsTypes?: boolean;
    useImplementingTypes?: boolean;
    defaultNullableToNull?: boolean;
    useTypeImports?: boolean;
    typeNamesMapping?: Record<string, string>;
    includedTypes?: string[];
    excludedTypes?: string[];
}
export declare const plugin: PluginFunction<TypescriptMocksPluginConfig>;
export {};
