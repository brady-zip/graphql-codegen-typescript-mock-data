import * as allFakerLocales from '@faker-js/faker';
import casual from 'casual';
class CasualMockValueGenerator {
    constructor(opts) {
        this.word = () => (this.dynamicValues ? `casual.word` : `'${casual.word}'`);
        this.uuid = () => (this.dynamicValues ? `casual.uuid` : `'${casual.uuid}'`);
        this.boolean = () => (this.dynamicValues ? `casual.boolean` : casual.boolean);
        this.integer = () => (this.dynamicValues ? `casual.integer(0, 9999)` : `${casual.integer(0, 9999)}`);
        this.float = () => this.dynamicValues
            ? `Math.round(casual.double(0, 10) * 100) / 100`
            : `${Math.round(casual.double(0, 10) * 100) / 100}`;
        this.date = () => this.dynamicValues
            ? `new Date(casual.unix_time).toISOString()`
            : `'${new Date(casual.unix_time).toISOString()}'`;
        this.seed = (seed) => casual.seed(seed);
        this.dynamicValues = opts.dynamicValues;
    }
}
const casualFunctionTokens = {
    import: `import casual from 'casual';`,
    seed: 'casual.seed(0);',
    seedFunction: 'export const seedMocks = (seed: number) => casual.seed(seed);',
};
class FakerMockValueGenerator {
    constructor(opts) {
        this.word = () => (this.dynamicValues ? `faker.lorem.word()` : `'${this.fakerInstance.lorem.word()}'`);
        this.uuid = () => (this.dynamicValues ? `faker.string.uuid()` : `'${this.fakerInstance.string.uuid()}'`);
        this.boolean = () => (this.dynamicValues ? `faker.datatype.boolean()` : this.fakerInstance.datatype.boolean());
        this.integer = () => this.dynamicValues
            ? `faker.number.int({ min: 0, max: 9999 })`
            : this.fakerInstance.number.int({ min: 0, max: 9999 });
        this.float = () => this.dynamicValues
            ? `faker.number.float({ min: 0, max: 10, fractionDigits: 1 })`
            : this.fakerInstance.number.float({ min: 0, max: 10, fractionDigits: 1 });
        this.date = () => this.dynamicValues
            ? `faker.date.past({ years: 1, refDate: new Date(2022, 0) }).toISOString()`
            : `'${this.fakerInstance.date.past({ years: 1, refDate: new Date(2022, 0) }).toISOString()}'`;
        this.seed = (seed) => this.fakerInstance.seed(seed);
        this.dynamicValues = opts.dynamicValues;
        const fakerImport = `faker${opts.generatorLocale.toUpperCase()}`;
        if (!(fakerImport in allFakerLocales)) {
            throw new Error(`Cannot find faker version for locale ${opts.generatorLocale.toUpperCase()}`);
        }
        this.fakerInstance = allFakerLocales[`faker${opts.generatorLocale.toUpperCase()}`];
    }
}
function getFakerFunctionTokens(locale = 'en') {
    return {
        import: `import { faker${locale.toUpperCase()} as faker } from '@faker-js/faker';`,
        seed: 'faker.seed(0);',
        seedFunction: 'export const seedMocks = (seed: number) => faker.seed(seed);',
    };
}
export const setupMockValueGenerator = ({ generateLibrary, dynamicValues, generatorLocale, }) => {
    switch (generateLibrary) {
        case 'casual':
            return new CasualMockValueGenerator({ dynamicValues, generatorLocale });
        case 'faker':
            return new FakerMockValueGenerator({ dynamicValues, generatorLocale });
    }
};
export const setupFunctionTokens = (generateLibrary, locale) => {
    switch (generateLibrary) {
        case 'casual':
            return casualFunctionTokens;
        case 'faker':
            return getFakerFunctionTokens(locale);
    }
};
//# sourceMappingURL=mockValueGenerator.js.map