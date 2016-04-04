import { Equatable, Helper } from "./helpers";

export interface TypeVisitor<TArg, TResult> {
    visitConst(type: TypeConst, arg: TArg): TResult;
    visitVariable(type: TypeVariable, arg: TArg): TResult;
    visitFunction(type: TypeFunction, arg: TArg): TResult;
    visitSchemata(type: TypeSchemata, arg: TArg): TResult;
}

export interface TypeToStringOptions {
    readonly priority: number;
}

export abstract class Type {
    public abstract equals(other: Type): boolean;
    public abstract accept<TArg, TResult>(visitor: TypeVisitor<TArg, TResult>, arg: TArg): TResult;
    public abstract toString(options?: TypeToStringOptions): string;
}

export class TypeConst extends Type { 
    public readonly name: string;
    
    constructor(name: string) {
        super();
        this.name = name;
    }
    
    public equals(other: Type): boolean {
        return other instanceof TypeConst && this.name == other.name;
    }
    
    public accept<TArg, TResult>(visitor: TypeVisitor<TArg, TResult>, arg: TArg): TResult {
        return visitor.visitConst(this, arg);
    }
    
    public toString(options?: TypeToStringOptions): string { return this.name; }
}

export class TypeVariable extends Type {
    public readonly name: string;
    
    constructor(name: string) {
        super();
        this.name = name;
    }
    
    public equals(other: Type): boolean {
        return other instanceof TypeVariable && this.name == other.name;
    }
    
    public accept<TArg, TResult>(visitor: TypeVisitor<TArg, TResult>, arg: TArg): TResult {
        return visitor.visitVariable(this, arg);
    }
    
    public toString(options?: TypeToStringOptions): string { return this.name; }
}

export class TypeFunction extends Type {
    public readonly from: Type;
    public readonly to: Type;
    
    constructor(from: Type, to: Type) {
        super();
        
        this.from = from;
        this.to = to;
    }
    
    public equals(other: Type): boolean {
        return other instanceof TypeFunction && this.from.equals(other.from) && this.to.equals(other.to);
    }
    
    public accept<TArg, TResult>(visitor: TypeVisitor<TArg, TResult>, arg: TArg): TResult {
        return visitor.visitFunction(this, arg);
    }
    
    public toString(options?: TypeToStringOptions): string {
        const priority = options ? options.priority : 0;
        const left = this.from.toString( { priority: -1 } ); 
        const right = this.to.toString( { priority: 0 } );
        let result = `${left} → ${right}`;
        if (priority < 0)
            result = "(" + result + ")"; 
        return result; 
    }
}

export class TypeSchemata extends Type {
    public readonly boundVariables: TypeVariable[];
    public readonly innerType: Type;
    
    constructor(boundVariables: TypeVariable[], innerType: Type) {
        super();
        
        this.boundVariables = boundVariables;
        this.innerType = innerType;
    }
    
    public equals(other: Type): boolean {
        if (other instanceof TypeSchemata) {
            var o = other;        
            return this.boundVariables.every((v, idx) => v.equals(o.boundVariables[idx])) && this.innerType.equals(other.innerType);
        }
        return false;
    }
    
    public accept<TArg, TResult>(visitor: TypeVisitor<TArg, TResult>, arg: TArg): TResult {
        return visitor.visitSchemata(this, arg);
    }
    
    public toString(options?: TypeToStringOptions): string { return `${ this.boundVariables.map(v => `∀${v.toString()}`).join(" ") } ${this.innerType.toString()}`; }
}



export class FreeTypeVariables implements TypeVisitor<void, TypeVariable[]> {
    
    public static get(type: Type): TypeVariable[] {
        const v = new FreeTypeVariables();
        return type.accept(v, null);
    }
    
    public visitConst(type: TypeConst): TypeVariable[] { return []; }
    
    public visitVariable(type: TypeVariable): TypeVariable[] { return [ type ]; }
    
    public visitFunction(type: TypeFunction): TypeVariable[] {
        return Helper.unique(
            type.from.accept(this, null)
            .concat(type.to.accept(this, null)), x => x.name);
    }
    
    public visitSchemata(type: TypeSchemata): TypeVariable[] {
        return Helper.without(type.innerType.accept(this, null), type.boundVariables);
    }
}


export interface Replacement {
    readonly variable: TypeVariable;
    readonly typeToInsert: Type
}

export class TypeVariableReplacer implements TypeVisitor<Replacement[], Type> {
    
    public static replace(type: Type, replacements: Replacement[]): Type {
        return type.accept(new TypeVariableReplacer(), replacements);
    }
    
    public visitConst(type: TypeConst, arg: Replacement[]): Type {
        return type;
    }
    
    public visitVariable(type: TypeVariable, arg: Replacement[]): Type {
        var t = arg.filter(a => a.variable.equals(type));
        if (t.length > 0)
            return t[0].typeToInsert;
        return type;
    }
    
    public visitFunction(type: TypeFunction, arg: Replacement[]): Type {
        return new TypeFunction(type.from.accept(this, arg), type.to.accept(this, arg));
    }
    
    public visitSchemata(type: TypeSchemata, arg: Replacement[]): Type {
        var arg2 = arg.filter(a => type.boundVariables.every(b => !b.equals(a.variable)));
        if (arg2.length === 0)
            return type;
        return new TypeSchemata(type.boundVariables, type.innerType.accept(this, arg2));
    }
}

