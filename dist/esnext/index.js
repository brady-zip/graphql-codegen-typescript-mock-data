import { parse } from 'graphql';
import * as allFakerLocales from '@faker-js/faker';
import casual from 'casual';
import { oldVisit, resolveExternalModuleAndFn } from '@graphql-codegen/plugin-helpers';
import { sentenceCase } from 'sentence-case';
import a from 'indefinite';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { setupFunctionTokens, setupMockValueGenerator } from './mockValueGenerator';
const getTerminateCircularRelationshipsConfig = ({ terminateCircularRelationships }) => terminateCircularRelationships ? terminateCircularRelationships : false;
const convertName = (value, fn, transformUnderscore) => {
    if (transformUnderscore) {
        return fn(value);
    }
    return value
        .split('_')
        .map((s) => fn(s))
        .join('_');
};
const createNameConverter = (convention, transformUnderscore) => (value, prefix = '') => {
    if (convention === 'keep') {
        return `${prefix}${value}`;
    }
    return `${prefix}${convertName(value, resolveExternalModuleAndFn(convention), transformUnderscore)}`;
};
const renameImports = (list, typeNamesMapping) => {
    return list.map((type) => {
        if (typeNamesMapping && typeNamesMapping[type]) {
            return `${type} as ${typeNamesMapping[type]}`;
        }
        return type;
    });
};
const toMockName = (typedName, casedName, prefix) => {
    if (prefix) {
        return `${prefix}${casedName}`;
    }
    const firstWord = sentenceCase(typedName).split(' ')[0];
    return `${a(firstWord, { articleOnly: true })}${casedName}`;
};
const hashedString = (value) => {
    let hash = 0;
    if (value.length === 0) {
        return hash;
    }
    for (let i = 0; i < value.length; i++) {
        const char = value.charCodeAt(i);
        // eslint-disable-next-line no-bitwise
        hash = (hash << 5) - hash + char;
        // eslint-disable-next-line no-bitwise
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
};
const getGeneratorDefinition = (opts, generatorMode) => {
    if (isAnInputOutputGeneratorOptions(opts)) {
        return buildGeneratorDefinition(opts[generatorMode]);
    }
    return buildGeneratorDefinition(opts);
};
const buildGeneratorDefinition = (opts) => {
    if (typeof opts === 'string') {
        return {
            generator: opts,
            arguments: [],
        };
    }
    return opts;
};
const getCasualCustomValue = (generatorDefinition, opts) => {
    // If there is a mapping to a `casual` type, then use it and make sure
    // to call it if it's a function
    const embeddedGenerator = casual[generatorDefinition.generator];
    if (!embeddedGenerator && generatorDefinition.generator) {
        return generatorDefinition.generator;
    }
    const generatorArgs = Array.isArray(generatorDefinition.arguments)
        ? generatorDefinition.arguments
        : [generatorDefinition.arguments];
    let extraArguments = [];
    const hasExtra = generatorDefinition.extra;
    if (hasExtra && generatorDefinition.extra.arguments) {
        extraArguments = Array.isArray(generatorDefinition.extra.arguments)
            ? generatorDefinition.extra.arguments
            : [generatorDefinition.extra.arguments];
    }
    if (opts.dynamicValues) {
        const extraCall = generatorDefinition.extra
            ? extraArguments.length
                ? `.${generatorDefinition.extra.function}(...${JSON.stringify(extraArguments)})`
                : `.${generatorDefinition.extra.function}()`
            : '';
        let functionCall = '';
        if (typeof embeddedGenerator === 'function') {
            functionCall = generatorArgs.length ? `(...${JSON.stringify(generatorArgs)})` : '()';
        }
        return `casual['${generatorDefinition.generator}']${functionCall}${extraCall}`;
    }
    let value = typeof embeddedGenerator === 'function' ? embeddedGenerator(...generatorArgs) : embeddedGenerator;
    if (hasExtra) {
        value = value[generatorDefinition.extra.function](...(extraArguments ? extraArguments : []));
    }
    if (typeof value === 'string') {
        return `'${value}'`;
    }
    if (typeof value === 'object') {
        return `${JSON.stringify(value)}`;
    }
    return value;
};
const getFakerGenerators = (generatorName, locale) => {
    let embeddedGenerator = allFakerLocales[`faker${locale.toUpperCase()}`];
    let dynamicGenerator = 'faker';
    if (typeof generatorName === 'string') {
        const generatorPath = generatorName.split('.');
        for (const key of generatorPath) {
            if (typeof embeddedGenerator === 'object' && key in embeddedGenerator) {
                embeddedGenerator = embeddedGenerator[key];
                dynamicGenerator = `${dynamicGenerator}['${key}']`;
            }
        }
    }
    // If the faker generator is not a function, we can assume the path is wrong
    if (typeof embeddedGenerator === 'function') {
        return { embeddedGenerator, dynamicGenerator };
    }
    return { embeddedGenerator: null, dynamicGenerator: null };
};
const getFakerCustomValue = (generatorDefinition, opts) => {
    // If there is a mapping to a `faker` type, then use it
    const { embeddedGenerator, dynamicGenerator } = getFakerGenerators(generatorDefinition.generator, opts.generatorLocale);
    if (!embeddedGenerator && generatorDefinition.generator) {
        return generatorDefinition.generator;
    }
    const generatorArgs = Array.isArray(generatorDefinition.arguments)
        ? generatorDefinition.arguments
        : [generatorDefinition.arguments];
    let extraArguments = [];
    const hasExtra = generatorDefinition.extra;
    if (hasExtra && generatorDefinition.extra.arguments) {
        extraArguments = Array.isArray(generatorDefinition.extra.arguments)
            ? generatorDefinition.extra.arguments
            : [generatorDefinition.extra.arguments];
    }
    if (opts.dynamicValues) {
        const extraCall = hasExtra
            ? extraArguments.length
                ? `.${generatorDefinition.extra.function}(...${JSON.stringify(extraArguments)})`
                : `.${generatorDefinition.extra.function}()`
            : '';
        return `${dynamicGenerator}${generatorArgs.length ? `(...${JSON.stringify(generatorArgs)})${extraCall}` : `()${extraCall}`}`;
    }
    const value = hasExtra
        ? embeddedGenerator(...generatorArgs)[generatorDefinition.extra.function](...(extraArguments ? extraArguments : []))
        : embeddedGenerator(...generatorArgs);
    if (typeof value === 'string') {
        return `'${value}'`;
    }
    if (typeof value === 'object') {
        return `${JSON.stringify(value)}`;
    }
    return value;
};
const getCustomValue = (generatorDefinition, opts) => {
    if (opts.generateLibrary === 'casual') {
        return getCasualCustomValue(generatorDefinition, opts);
    }
    if (opts.generateLibrary === 'faker') {
        return getFakerCustomValue(generatorDefinition, opts);
    }
    throw `Unknown generator library: ${opts.generateLibrary}`;
};
const handleValueGeneration = (opts, customScalar, baseGenerator) => {
    if (opts.defaultNullableToNull && !opts.nonNull) {
        return null;
    }
    if (opts.fieldGeneration) {
        // Check for a specific generation for the type & field
        if (opts.typeName in opts.fieldGeneration && opts.fieldName in opts.fieldGeneration[opts.typeName]) {
            const generatorDefinition = getGeneratorDefinition(opts.fieldGeneration[opts.typeName][opts.fieldName], opts.generatorMode);
            return getCustomValue(generatorDefinition, opts);
        }
        // Check for a general field generation definition
        if ('_all' in opts.fieldGeneration && opts.fieldName in opts.fieldGeneration['_all']) {
            const generatorDefinition = getGeneratorDefinition(opts.fieldGeneration['_all'][opts.fieldName], opts.generatorMode);
            return getCustomValue(generatorDefinition, opts);
        }
    }
    if (customScalar) {
        return getCustomValue(customScalar, opts);
    }
    return baseGenerator();
};
const getNamedImplementType = (opts) => {
    const { currentType } = opts;
    if (!currentType || !('name' in currentType)) {
        return '';
    }
    return getNamedType({
        ...opts,
        currentType,
    });
};
const getNamedType = (opts) => {
    if (!opts.currentType) {
        return '';
    }
    const mockValueGenerator = setupMockValueGenerator({
        generateLibrary: opts.generateLibrary,
        dynamicValues: opts.dynamicValues,
        generatorLocale: opts.generatorLocale,
    });
    if (!opts.dynamicValues)
        mockValueGenerator.seed(hashedString(opts.typeName + opts.fieldName));
    const name = opts.currentType.name.value;
    const casedName = createNameConverter(opts.typeNamesConvention, opts.transformUnderscore)(name);
    switch (name) {
        case 'String': {
            const customScalar = opts.customScalars
                ? getGeneratorDefinition(opts.customScalars['String'], opts.generatorMode)
                : null;
            return handleValueGeneration(opts, customScalar, mockValueGenerator.word);
        }
        case 'Float': {
            const customScalar = opts.customScalars
                ? getGeneratorDefinition(opts.customScalars['Float'], opts.generatorMode)
                : null;
            return handleValueGeneration(opts, customScalar, mockValueGenerator.float);
        }
        case 'ID': {
            const customScalar = opts.customScalars
                ? getGeneratorDefinition(opts.customScalars['ID'], opts.generatorMode)
                : null;
            return handleValueGeneration(opts, customScalar, mockValueGenerator.uuid);
        }
        case 'Boolean': {
            const customScalar = opts.customScalars
                ? getGeneratorDefinition(opts.customScalars['Boolean'], opts.generatorMode)
                : null;
            return handleValueGeneration(opts, customScalar, mockValueGenerator.boolean);
        }
        case 'Int': {
            const customScalar = opts.customScalars
                ? getGeneratorDefinition(opts.customScalars['Int'], opts.generatorMode)
                : null;
            return handleValueGeneration(opts, customScalar, mockValueGenerator.integer);
        }
        default: {
            const foundTypes = opts.types.filter((foundType) => {
                if (foundType.types && 'interfaces' in foundType.types)
                    return foundType.types.interfaces.some((item) => item.name.value === name);
                return foundType.name === name;
            });
            if (foundTypes.length) {
                const foundType = foundTypes[0];
                switch (foundType.type) {
                    case 'enum': {
                        // It's an enum
                        const typenameConverter = createNameConverter(opts.typeNamesConvention, opts.transformUnderscore);
                        const enumConverter = createNameConverter(opts.enumValuesConvention, !opts.enumsAsTypes);
                        const value = foundType.values ? foundType.values[0] : '';
                        return handleValueGeneration(opts, undefined, () => opts.enumsAsTypes
                            ? opts.useTypeImports
                                ? `('${value}' as ${typenameConverter(foundType.name, opts.enumsPrefix)})`
                                : `'${value}'`
                            : `${typenameConverter(foundType.name, opts.enumsPrefix)}.${enumConverter(value)}`);
                    }
                    case 'union':
                        // Return the first union type node.
                        return getNamedType({
                            ...opts,
                            currentType: foundType.types && foundType.types[0],
                        });
                    case 'scalar': {
                        const customScalar = opts.customScalars
                            ? getGeneratorDefinition(opts.customScalars[foundType.name], opts.generatorMode)
                            : null;
                        // it's a scalar, let's use a string as a value if there is no custom
                        // mapping for this particular scalar
                        return handleValueGeneration(opts, customScalar, foundType.name === 'Date' ? mockValueGenerator.date : mockValueGenerator.word);
                    }
                    case 'implement':
                        if (opts.fieldGeneration &&
                            opts.fieldGeneration[opts.typeName] &&
                            opts.fieldGeneration[opts.typeName][opts.fieldName])
                            break;
                        return (foundTypes
                            .map((implementType) => getNamedImplementType({
                            ...opts,
                            currentType: implementType.types,
                        }))
                            .filter((value) => value !== null)
                            .join(' || ') || null);
                    default:
                        throw `foundType is unknown: ${foundType.name}: ${foundType.type}`;
                }
            }
            if (opts.terminateCircularRelationships && !opts.inputOneOfTypes.has(opts.currentType.name.value)) {
                return handleValueGeneration(opts, null, () => {
                    if (opts.typesPrefix) {
                        const typeNameConverter = createNameConverter(opts.typeNamesConvention, opts.transformUnderscore);
                        const renamedType = renameImports([name], opts.typeNamesMapping)[0];
                        const casedNameWithPrefix = typeNameConverter(renamedType, opts.typesPrefix);
                        return `relationshipsToOmit.has('${casedName}') ? {} as ${casedNameWithPrefix} : ${toMockName(name, casedName, opts.prefix)}({}, relationshipsToOmit)`;
                    }
                    else {
                        const renamedType = renameImports([name], opts.typeNamesMapping)[0];
                        const renamedCasedName = createNameConverter(opts.typeNamesConvention, opts.transformUnderscore)(renamedType);
                        return `relationshipsToOmit.has('${casedName}') ? {} as ${renamedCasedName} : ${toMockName(name, casedName, opts.prefix)}({}, relationshipsToOmit)`;
                    }
                });
            }
            else {
                return handleValueGeneration(opts, null, () => `${toMockName(name, casedName, opts.prefix)}()`);
            }
        }
    }
};
const generateMockValue = (opts) => {
    var _a, _b;
    switch (opts.currentType.kind) {
        case 'NamedType':
            return getNamedType({
                ...opts,
                currentType: opts.currentType,
            });
        case 'NonNullType':
            return generateMockValue({
                ...opts,
                currentType: opts.currentType.type,
                nonNull: true,
            });
        case 'ListType': {
            const hasOverride = (_b = (_a = opts.fieldGeneration) === null || _a === void 0 ? void 0 : _a[opts.typeName]) === null || _b === void 0 ? void 0 : _b[opts.fieldName];
            if (!hasOverride && opts.defaultNullableToNull && !opts.nonNull) {
                return null;
            }
            const listElements = Array.from({ length: opts.listElementCount }, (_, index) => generateMockValue({
                ...opts,
                fieldName: opts.listElementCount === 1 ? opts.fieldName : `${opts.fieldName}${index}`,
                currentType: opts.currentType.type,
            }));
            return `[${listElements.join(', ')}]`;
        }
        default:
            throw new Error('unreached');
    }
};
const getMockString = (typeName, fields, typeNamesConvention, terminateCircularRelationships, addTypename = false, prefix, typesPrefix = '', transformUnderscore, typeNamesMapping, hasOneOfDirective = false) => {
    const typeNameConverter = createNameConverter(typeNamesConvention, transformUnderscore);
    const NewTypeName = typeNamesMapping[typeName] || typeName;
    const casedName = typeNameConverter(typeName);
    const casedNameWithPrefix = typeNameConverter(NewTypeName, typesPrefix);
    const typename = addTypename ? `\n        __typename: '${typeName}',` : '';
    const typenameReturnType = addTypename ? `{ __typename: '${typeName}' } & ` : '';
    const overridesArgumentString = !hasOneOfDirective
        ? `overrides?: Partial<${casedNameWithPrefix}>`
        : `override?: ${casedNameWithPrefix}`;
    if (terminateCircularRelationships) {
        const relationshipsToOmitInit = terminateCircularRelationships === 'immediate' ? '_relationshipsToOmit' : 'new Set(_relationshipsToOmit)';
        return `
export const ${toMockName(typeName, casedName, prefix)} = (${overridesArgumentString}, _relationshipsToOmit: Set<string> = new Set()): ${typenameReturnType}${casedNameWithPrefix} => {
    const relationshipsToOmit: Set<string> = ${relationshipsToOmitInit};
    relationshipsToOmit.add('${casedName}');
    return {${typename}
${fields}
    };
};`;
    }
    else {
        return `
export const ${toMockName(typeName, casedName, prefix)} = (${overridesArgumentString}): ${typenameReturnType}${casedNameWithPrefix} => {
    return {${typename}
${fields}
    };
};`;
    }
};
const getImportTypes = ({ typeNamesConvention, definitions, types, typesFile, typesPrefix, enumsPrefix, transformUnderscore, enumsAsTypes, useTypeImports, typeNamesMapping, }) => {
    const typenameConverter = createNameConverter(typeNamesConvention, transformUnderscore);
    const typeImports = (typesPrefix === null || typesPrefix === void 0 ? void 0 : typesPrefix.endsWith('.'))
        ? [typesPrefix.slice(0, -1)]
        : definitions
            .filter(({ typeName }) => !!typeName)
            .map(({ typeName }) => typenameConverter(typeName, typesPrefix));
    const enumTypes = (enumsPrefix === null || enumsPrefix === void 0 ? void 0 : enumsPrefix.endsWith('.'))
        ? [enumsPrefix.slice(0, -1)]
        : types.filter(({ type }) => type === 'enum').map(({ name }) => typenameConverter(name, enumsPrefix));
    const renamedTypeImports = renameImports(typeImports, typeNamesMapping);
    if (!enumsAsTypes || useTypeImports) {
        renamedTypeImports.push(...enumTypes);
    }
    function onlyUnique(value, index, self) {
        return self.indexOf(value) === index;
    }
    const importPrefix = `import ${useTypeImports ? 'type ' : ''}`;
    return typesFile
        ? `${importPrefix}{ ${renamedTypeImports.filter(onlyUnique).join(', ')} } from '${typesFile}';\n`
        : '';
};
const isAnInputOutputGeneratorOptions = (opts) => opts !== undefined && typeof opts !== 'string' && 'input' in opts && 'output' in opts;
// This plugin was generated with the help of ast explorer.
// https://astexplorer.net
// Paste your graphql schema in it, and you'll be able to see what the `astNode` will look like
export const plugin = (schema, documents, config) => {
    var _a, _b, _c, _d, _e, _f;
    const printedSchema = printSchemaWithDirectives(schema); // Returns a string representation of the schema
    const astNode = parse(printedSchema); // Transforms the string into ASTNode
    if ('typenames' in config) {
        throw new Error('Config `typenames` was renamed to `typeNames`. Please update your config');
    }
    const enumValuesConvention = config.enumValues || 'change-case-all#pascalCase';
    const typeNamesConvention = config.typeNames || 'change-case-all#pascalCase';
    const transformUnderscore = (_a = config.transformUnderscore) !== null && _a !== void 0 ? _a : true;
    const listElementCount = Math.max(0, (_b = config.listElementCount) !== null && _b !== void 0 ? _b : 1);
    const dynamicValues = !!config.dynamicValues;
    const generateLibrary = config.generateLibrary || 'faker';
    const enumsAsTypes = (_c = config.enumsAsTypes) !== null && _c !== void 0 ? _c : false;
    const useTypeImports = (_d = config.useTypeImports) !== null && _d !== void 0 ? _d : false;
    const useImplementingTypes = (_e = config.useImplementingTypes) !== null && _e !== void 0 ? _e : false;
    const defaultNullableToNull = (_f = config.defaultNullableToNull) !== null && _f !== void 0 ? _f : false;
    const generatorLocale = config.locale || 'en';
    const typeNamesMapping = config.typeNamesMapping || {};
    // List of types that are enums
    const types = [];
    const inputOneOfTypes = new Set();
    const typeVisitor = {
        EnumTypeDefinition: (node) => {
            const name = node.name.value;
            if (!types.find((enumType) => enumType.name === name)) {
                types.push({
                    name,
                    type: 'enum',
                    values: node.values ? node.values.map((node) => node.name.value) : [],
                });
            }
        },
        UnionTypeDefinition: (node) => {
            const name = node.name.value;
            if (!types.find((enumType) => enumType.name === name)) {
                types.push({
                    name,
                    type: 'union',
                    types: node.types,
                });
            }
        },
        ObjectTypeDefinition: (node) => {
            // This function triggered per each type
            const typeName = node.name.value;
            if (config.useImplementingTypes) {
                if (!types.find((objectType) => objectType.name === typeName)) {
                    node.interfaces.length &&
                        types.push({
                            name: typeName,
                            type: 'implement',
                            types: node,
                        });
                }
            }
        },
        InputObjectTypeDefinition: (node) => {
            if (node.directives.some((directive) => directive.name.value === 'oneOf')) {
                inputOneOfTypes.add(node.name.value);
            }
        },
        ScalarTypeDefinition: (node) => {
            const name = node.name.value;
            if (!types.find((scalarType) => scalarType.name === name)) {
                types.push({
                    name,
                    type: 'scalar',
                });
            }
        },
    };
    const sharedGenerateMockOpts = {
        customScalars: config.scalars,
        defaultNullableToNull,
        dynamicValues,
        enumsAsTypes,
        enumsPrefix: config.enumsPrefix,
        enumValuesConvention,
        fieldGeneration: config.fieldGeneration,
        generateLibrary,
        generatorLocale,
        listElementCount,
        nonNull: false,
        prefix: config.prefix,
        terminateCircularRelationships: getTerminateCircularRelationshipsConfig(config),
        transformUnderscore,
        typeNamesConvention,
        typeNamesMapping,
        types,
        typesPrefix: config.typesPrefix,
        useImplementingTypes,
        useTypeImports,
        inputOneOfTypes,
    };
    const visitor = {
        FieldDefinition: (node) => {
            const fieldName = node.name.value;
            return {
                name: fieldName,
                mockFn: (typeName) => {
                    const value = generateMockValue({
                        typeName,
                        fieldName,
                        generatorMode: 'output',
                        currentType: node.type,
                        ...sharedGenerateMockOpts,
                    });
                    return `        ${fieldName}: overrides && overrides.hasOwnProperty('${fieldName}') ? overrides.${fieldName}! : ${value},`;
                },
            };
        },
        InputObjectTypeDefinition: (node) => {
            const fieldName = node.name.value;
            return {
                typeName: fieldName,
                mockFn: () => {
                    let mockFieldsString = '';
                    const { directives } = node;
                    const hasOneOfDirective = directives.some((directive) => directive.name.value === 'oneOf');
                    if (node.fields && node.fields.length > 0 && hasOneOfDirective) {
                        const field = node.fields[0];
                        const value = generateMockValue({
                            typeName: fieldName,
                            fieldName: field.name.value,
                            currentType: field.type,
                            generatorMode: 'input',
                            ...sharedGenerateMockOpts,
                        });
                        mockFieldsString = `        ...(override ? override : {${field.name.value} : ${value}}),`;
                    }
                    else if (node.fields) {
                        mockFieldsString = node.fields
                            .map((field) => {
                            const value = generateMockValue({
                                typeName: fieldName,
                                fieldName: field.name.value,
                                currentType: field.type,
                                generatorMode: 'input',
                                ...sharedGenerateMockOpts,
                            });
                            const valueWithOverride = `overrides && overrides.hasOwnProperty('${field.name.value}') ? overrides.${field.name.value}! : ${value}`;
                            return `        ${field.name.value}: ${valueWithOverride},`;
                        })
                            .join('\n');
                    }
                    return getMockString(fieldName, mockFieldsString, typeNamesConvention, getTerminateCircularRelationshipsConfig(config), false, config.prefix, config.typesPrefix, transformUnderscore, typeNamesMapping, hasOneOfDirective);
                },
            };
        },
        ObjectTypeDefinition: (node) => {
            // This function triggered per each type
            const typeName = node.name.value;
            const { fields } = node;
            return {
                typeName,
                mockFn: () => {
                    const mockFields = fields ? fields.map(({ mockFn }) => mockFn(typeName)).join('\n') : '';
                    return getMockString(typeName, mockFields, typeNamesConvention, getTerminateCircularRelationshipsConfig(config), !!config.addTypename, config.prefix, config.typesPrefix, transformUnderscore, typeNamesMapping);
                },
            };
        },
        InterfaceTypeDefinition: (node) => {
            const typeName = node.name.value;
            const { fields } = node;
            return {
                typeName,
                mockFn: () => {
                    const mockFields = fields ? fields.map(({ mockFn }) => mockFn(typeName)).join('\n') : '';
                    return getMockString(typeName, mockFields, typeNamesConvention, getTerminateCircularRelationshipsConfig(config), !!config.addTypename, config.prefix, config.typesPrefix, transformUnderscore, typeNamesMapping);
                },
            };
        },
    };
    // run on the types first
    oldVisit(astNode, { leave: typeVisitor });
    const result = oldVisit(astNode, { leave: visitor });
    const { includedTypes, excludedTypes } = config;
    const shouldGenerateMockForType = (typeName) => {
        if (!typeName) {
            return true;
        }
        if (includedTypes && includedTypes.length > 0) {
            return includedTypes.includes(typeName);
        }
        if (excludedTypes && excludedTypes.length > 0) {
            return !excludedTypes.includes(typeName);
        }
        return true;
    };
    const definitions = result.definitions.filter((definition) => !!definition && shouldGenerateMockForType(definition.typeName));
    const typesFile = config.typesFile ? config.typesFile.replace(/\.[\w]+$/, '') : null;
    const typesFileImport = getImportTypes({
        typeNamesConvention,
        definitions,
        types,
        typesFile,
        typesPrefix: config.typesPrefix,
        enumsPrefix: config.enumsPrefix,
        transformUnderscore: transformUnderscore,
        useTypeImports: config.useTypeImports,
        enumsAsTypes,
        typeNamesMapping,
    });
    // Function that will generate the mocks.
    // We generate it after having visited because we need to distinct types from enums
    const mockFns = definitions
        .map(({ mockFn }) => mockFn)
        .filter((mockFn) => !!mockFn)
        .map((mockFn) => mockFn())
        .join('\n');
    const functionTokens = setupFunctionTokens(generateLibrary, generatorLocale);
    let mockFile = '';
    if (dynamicValues)
        mockFile += `${functionTokens.import}\n`;
    mockFile += typesFileImport;
    if (dynamicValues)
        mockFile += `\n${functionTokens.seed}\n`;
    mockFile += mockFns;
    if (dynamicValues)
        mockFile += `\n\n${functionTokens.seedFunction}`;
    mockFile += '\n';
    return mockFile;
};
//# sourceMappingURL=index.js.map