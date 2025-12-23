// ============================================
// IJe Type System
// Gradual typing with Thai type names
// ============================================

// ==========================================
// TYPE NAMES (Thai)
// ==========================================
// lek  = number (เลข)
// kum  = string (คำ)  
// bool = boolean
// wang = null (ว่าง)
// list = array
// kong = object (ของ)
// any  = any type

export const TypeName = {
    LEK: 'lek',      // number
    KUM: 'kum',      // string
    BOOL: 'bool',    // boolean
    WANG: 'wang',    // null
    ANY: 'any',      // any
    LIST: 'list',    // array
    KONG: 'kong',    // object
    FUNCTION: 'kian', // function
    CLASS: 'klum',   // class
} as const;

export type TypeName = typeof TypeName[keyof typeof TypeName];

// ==========================================
// TYPE ANNOTATION
// ==========================================

export interface TypeAnnotation {
    name: TypeName;                              // Base type name
    elementType?: TypeAnnotation;                // For arrays: list[lek]
    keyType?: TypeAnnotation;                    // For maps
    valueType?: TypeAnnotation;                  // For maps
    properties?: Map<string, TypeAnnotation>;    // For typed objects
    params?: TypeAnnotation[];                   // For function params
    returnType?: TypeAnnotation;                 // For function return
    nullable?: boolean;                          // Allow wang?
}

// ==========================================
// TYPE CONSTRUCTORS
// ==========================================

export function createType(name: TypeName): TypeAnnotation {
    return { name };
}

export function createArrayType(elementType: TypeAnnotation): TypeAnnotation {
    return { name: TypeName.LIST, elementType };
}

export function createFunctionType(params: TypeAnnotation[], returnType: TypeAnnotation): TypeAnnotation {
    return { name: TypeName.FUNCTION, params, returnType };
}

export function createNullableType(base: TypeAnnotation): TypeAnnotation {
    return { ...base, nullable: true };
}

// Pre-built primitive types
export const Types = {
    LEK: createType(TypeName.LEK),
    KUM: createType(TypeName.KUM),
    BOOL: createType(TypeName.BOOL),
    WANG: createType(TypeName.WANG),
    ANY: createType(TypeName.ANY),
    LIST: createType(TypeName.LIST),
    KONG: createType(TypeName.KONG),
} as const;

// ==========================================
// TYPE INFERENCE
// ==========================================

export function inferType(value: any): TypeAnnotation {
    if (value === null || value === undefined) {
        return Types.WANG;
    }

    if (typeof value === 'number') {
        return Types.LEK;
    }

    if (typeof value === 'string') {
        return Types.KUM;
    }

    if (typeof value === 'boolean') {
        return Types.BOOL;
    }

    if (Array.isArray(value)) {
        if (value.length === 0) {
            return createArrayType(Types.ANY);
        }
        // Infer element type from first element
        return createArrayType(inferType(value[0]));
    }

    if (typeof value === 'object') {
        // Check for IJe runtime types
        const type = (value as any).type;
        if (type === 'array') {
            const elements = (value as any).elements || [];
            if (elements.length === 0) {
                return createArrayType(Types.ANY);
            }
            return createArrayType(inferType(elements[0]));
        }
        if (type === 'object') {
            return Types.KONG;
        }
        if (type === 'function' || type === 'closure') {
            return { name: TypeName.FUNCTION };
        }
        if (type === 'class') {
            return { name: TypeName.CLASS };
        }
        if (type === 'instance') {
            return Types.KONG;
        }

        return Types.KONG;
    }

    return Types.ANY;
}

// ==========================================
// TYPE CHECKING
// ==========================================

export function checkType(value: any, expected: TypeAnnotation): boolean {
    // Any matches everything
    if (expected.name === TypeName.ANY) {
        return true;
    }

    // Handle nullable types
    if ((value === null || value === undefined) && expected.nullable) {
        return true;
    }

    const actual = inferType(value);

    // Check base type
    if (!typesCompatible(actual, expected)) {
        return false;
    }

    // Check array element types
    if (expected.name === TypeName.LIST && expected.elementType) {
        const elements = Array.isArray(value) ? value : (value?.elements || []);
        for (const elem of elements) {
            if (!checkType(elem, expected.elementType)) {
                return false;
            }
        }
    }

    return true;
}

export function typesCompatible(actual: TypeAnnotation, expected: TypeAnnotation): boolean {
    // Any is compatible with everything
    if (expected.name === TypeName.ANY || actual.name === TypeName.ANY) {
        return true;
    }

    // Wang (null) is compatible with nullable types
    if (actual.name === TypeName.WANG && expected.nullable) {
        return true;
    }

    // Basic name match
    return actual.name === expected.name;
}

// ==========================================
// TYPE TO STRING
// ==========================================

export function typeToString(type: TypeAnnotation): string {
    let str: string = type.name;

    if (type.name === TypeName.LIST && type.elementType) {
        str = `list[${typeToString(type.elementType)}]`;
    }

    if (type.name === TypeName.FUNCTION) {
        const params = type.params?.map(p => typeToString(p)).join(', ') || '';
        const ret = type.returnType ? typeToString(type.returnType) : 'wang';
        str = `kian(${params}): ${ret}`;
    }

    if (type.nullable) {
        str += '?';
    }

    return str;
}

// ==========================================
// TYPE ERROR MESSAGES (Thai Roasts)
// ==========================================

export const TYPE_ROASTS = {
    wrongType: (expected: string, actual: string, varName?: string) =>
        `🔥 ประเภทผิด! ${varName ? `'${varName}'` : 'ค่านี้'} ต้องเป็น ${expected} แต่มึงให้ ${actual} มา! เรียนประเภทข้อมูลใหม่เถอะ`,

    wrongParamType: (paramName: string, expected: string, actual: string) =>
        `🔥 พารามิเตอร์ '${paramName}' ต้องเป็น ${expected} แต่ได้รับ ${actual}! มึงส่งอะไรมาให้ฟังก์ชันวะ?`,

    wrongReturnType: (expected: string, actual: string) =>
        `🔥 ฟังก์ชันต้อง return ${expected} แต่มึง return ${actual}! ตรวจสอบค่าที่ return ด้วย`,

    notCallable: (type: string) =>
        `🔥 ประเภท ${type} เรียกเป็นฟังก์ชันไม่ได้! มึงคิดว่าทุกอย่างเรียกได้หรอ?`,

    notIndexable: (type: string) =>
        `🔥 ประเภท ${type} ใช้ index ไม่ได้! นี่ไม่ใช่ array หรือ object!`,
};

// Helper to create type error
export function createTypeError(expected: TypeAnnotation, actual: any, varName?: string): string {
    const expectedStr = typeToString(expected);
    const actualType = inferType(actual);
    const actualStr = typeToString(actualType);
    return TYPE_ROASTS.wrongType(expectedStr, actualStr, varName);
}
