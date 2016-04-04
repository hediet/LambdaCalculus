import { Equatable, Helper, Map, FiniteMap, HashMap, FiniteHierarchyMap, HierarchyMap } from "./helpers";

import { Term, ConstTerm, VariableTerm, AbstractionTerm, ApplicationTerm, LetTerm, FreeVariables, BoundVariables, TermVisitor } from "./terms";
import { Type, TypeConst, TypeVariable, TypeFunction, TypeSchemata, FreeTypeVariables, TypeVisitor, TypeVariableReplacer, Replacement } from "./types";


export class TypeContext {
    
    private readonly localVariableTypings: FiniteMap<VariableTerm, Type>;
    public readonly localConstTypings: Map<ConstTerm, Type>;
    
    public readonly variableTypings: FiniteMap<VariableTerm, Type>;
    public readonly constTypings: Map<ConstTerm, Type>;
    public readonly parent: TypeContext;
    
    constructor(variableTypings?: { variable: VariableTerm, type: Type }[], constTypings?: Map<ConstTerm, Type>, parent?: TypeContext) {
        this.parent = parent;
        if (variableTypings === undefined)
            variableTypings = [];
            
        this.localVariableTypings = new HashMap<VariableTerm, Type>(
            variableTypings.map(x => { return { key: x.variable, value: x.type };}), k => k.name);
            
        if (constTypings === undefined)
            this.localConstTypings = null;
        else
            this.localConstTypings = constTypings;
        
        if (parent === undefined) {
            this.variableTypings = this.localVariableTypings;
            this.constTypings = (this.localConstTypings === null) ? new HashMap<ConstTerm, Type>() : this.localConstTypings;
        }
        else {
            this.variableTypings = new FiniteHierarchyMap(parent.variableTypings, this.localVariableTypings);
            this.constTypings = (this.localConstTypings === null) ? parent.constTypings : new HierarchyMap(parent.constTypings, this.localConstTypings);
        }
    }
    
    public getFreeTypeVariables() : TypeVariable[] {
        return Helper.unique(
            this.variableTypings.getKeys().map(
                k => this.variableTypings.get(k))
                    .reduce((p, c) => p.concat(FreeTypeVariables.get(c)), <TypeVariable[]>[]), 
            x => x.name);
    }
}





class TypeInferenceContext {
    
    public static createFromParent(parent: TypeInferenceContext, varTerm: VariableTerm, type: Type): TypeInferenceContext {
        var newTypeContext = new TypeContext([ { variable: varTerm, type: type } ], undefined, parent.typeContext);
        return new TypeInferenceContext(parent, newTypeContext);
    }
    
    private variableCount = 0;
    
    private readonly parent: TypeInferenceContext;
    public readonly typeContext: TypeContext;
    public readonly types: HashMap<Term, Type>;
    
    private readonly constraints: Constraint[] = [];
    
    constructor(parent?: TypeInferenceContext, typeContext?: TypeContext) {
        this.parent = (parent === undefined) ? this : parent;
        if (parent === undefined)
            this.types = new HashMap<Term, Type>();
        else
            this.types = this.parent.types;
        this.constraints = this.parent.constraints;
        this.typeContext = typeContext ? typeContext : (parent ? parent.typeContext : new TypeContext());
    }
    
    public getConstraints(): Constraint[] { return this.constraints; }
    
    public setConstraint(value1: Type, value2: Type) {
        this.constraints.push({ value1: value1, value2: value2 });
    }
    
    public createNewVariable(context: TypeContext): TypeVariable {
        const freeVars = context.getFreeTypeVariables();
        while (true) {
            this.parent.variableCount++;
            const v = new TypeVariable("v" + this.parent.variableCount);
            if (!freeVars.some(f => f.equals(v)))
                return v;
        }
    }
}

interface Constraint {
    readonly value1: Type;
    readonly value2: Type;
}



export class TypeInference implements TermVisitor<TypeInferenceContext, Type> {
    
    public static typify(t: Term, typeContext: TypeContext): Map<Term, Type>|null {
        
        const arg = new TypeInferenceContext(undefined, typeContext);
        const i = new TypeInference();
        i.getType(t, arg);
        
        const mgu = Unification.unificate(arg.getConstraints());
        
        if (mgu === null)
            return null;
        
        var result = new HashMap<Term, Type>();
        
        arg.types.getKeys().forEach(t => {
            const type = arg.types.get(t);
            const type2 = TypeVariableReplacer.replace(type, mgu);
            result.set(t, type2);
        });
        
        return result;
    }
    
    private getType(term: Term, arg: TypeInferenceContext): Type {
        const type = term.accept(this, arg);
        arg.types.set(term, type);
        return type;
    }

    public visitVariable(term: VariableTerm, arg: TypeInferenceContext): Type {
        if (arg.typeContext.variableTypings.has(term)) {
            return arg.typeContext.variableTypings.get(term);
        }
        return arg.createNewVariable(arg.typeContext);
    }
    
    public visitConst(term: ConstTerm, arg: TypeInferenceContext): Type {
        return arg.typeContext.constTypings.get(term);
    }
    
    public visitApplication(term: ApplicationTerm, arg: TypeInferenceContext): Type {
        const argType = this.getType(term.argument, arg);
        
        const resultType = arg.createNewVariable(arg.typeContext);
        let functionType = this.getType(term.func, arg);
        
        while (functionType instanceof TypeSchemata) {
            const x = functionType as TypeSchemata;
            var replacements = x.boundVariables.map(b => { 
                return { variable: b, typeToInsert: arg.createNewVariable(arg.typeContext)  }; });
            functionType = TypeVariableReplacer.replace(x.innerType, replacements);
        }

        arg.setConstraint(functionType, new TypeFunction(argType, resultType));
        
        return resultType;
    }
    
    public visitAbstraction(term: AbstractionTerm, arg: TypeInferenceContext): Type {
        const argType = arg.createNewVariable(arg.typeContext);
        const newArg = TypeInferenceContext.createFromParent(arg, term.boundVariable, argType);
        const argType2 = this.getType(term.boundVariable, newArg);
        if (!argType.equals(argType2)) throw new Error();
        
        const bodyType = this.getType(term.body, newArg);
        
        return new TypeFunction(argType, bodyType);
    }
    
    public visitLet(term: LetTerm, arg: TypeInferenceContext): Type {
        
        let type = this.getType(term.boundTerm, arg);
        const mgu = Unification.unificate(arg.getConstraints());
        let freeVarsInTypeContext: TypeVariable[] = [];
        
        if (mgu !== null) {
            type = TypeVariableReplacer.replace(type, mgu);
            
            freeVarsInTypeContext = arg.typeContext.getFreeTypeVariables().map(
                v => FreeTypeVariables.get(TypeVariableReplacer.replace(v, mgu)))
                .reduce((p, c) => p.concat(c), []);
        }

        const boundTypes = Helper.without(FreeTypeVariables.get(type), freeVarsInTypeContext);
        const typeSchemata = new TypeSchemata(boundTypes, type);
        const bodyType = this.getType(term.body, TypeInferenceContext.createFromParent(arg, term.boundVariable, typeSchemata)); 
       
        return bodyType;
    }
}




class Unification {
    
    public static unificate(constraints: Constraint[]): Replacement[]|null {
        
        let result: Replacement[] = [];
        
        constraints = constraints.slice().reverse();
        
        while (constraints.length > 0) {
            
            const con = constraints.pop();   
            
            let value1 = con.value1;
            let value2 = con.value2;
            
            if (value1.equals(value2))
                continue;
            
            if (!(value1 instanceof TypeVariable) && value2 instanceof TypeVariable)
                [ value1, value2 ] = [ value2, value1 ];
            
            if (value1 instanceof TypeVariable) {
                
                const v1 = value1;
                const existing = Helper.first(result, r => r.variable.equals(v1));
                if (existing !== undefined) {
                    if (!existing.typeToInsert.equals(value2))
                        return null;
                }
                else {
                    var replacement = { variable: value1, typeToInsert: value2 };
                    result = result.map(r => ({ variable: r.variable, typeToInsert: TypeVariableReplacer.replace(r.typeToInsert, [replacement]) }));
                    
                    constraints = constraints.map(c => ({
                        value1: TypeVariableReplacer.replace(c.value1, [{ variable: v1, typeToInsert: value2 }]),
                        value2: TypeVariableReplacer.replace(c.value2, [{ variable: v1, typeToInsert: value2 }])
                    }));
                    
                    result.push(replacement);
                }
            }
            else if (value1 instanceof TypeFunction && value2 instanceof TypeFunction) {
                constraints.push({ value1: value1.from, value2: value2.from });
                constraints.push({ value1: value1.to, value2: value2.to });
            }
            else
                return null;
        }        
        
        return result;
    }
}




export class TypeInfoTermPrinter implements TermVisitor<Map<Term, Type>, string> {
    public static print(term: Term, typeInfo: Map<Term, Type>): string {
        return term.accept(new TypeInfoTermPrinter(), typeInfo);
    }
    
    public visitVariable(term: VariableTerm, arg: Map<Term, Type>): string { return `${term.toString()}:(${arg.get(term).toString()}`; }
    
    public visitConst(term: ConstTerm, arg: Map<Term, Type>): string { return `${term.toString()}:(${arg.get(term).toString()}`; }
    
    public visitApplication(term: ApplicationTerm, arg: Map<Term, Type>): string { 
        return `(${term.func.accept(this, arg)})(${term.argument.accept(this, arg)}) : (${arg.get(term).toString()})`;
    }
    
    public visitAbstraction(term: AbstractionTerm, arg: Map<Term, Type>): string {
        return `(${term.boundVariable.accept(this, arg)}) → (${term.body.accept(this, arg)}) : (${arg.get(term).toString()})`;
    }
    
    public visitLet(term: LetTerm, arg: Map<Term, Type>): string {
        throw null;
    }
}


export class CommonConsts implements Map<ConstTerm, Type> {
    
    public readonly integer = new TypeConst("Integer");
    public readonly bool = new TypeConst("Boolean");
    public readonly unknown = new TypeConst("Unknown");
    
    public get(term: ConstTerm): Type {
        if (/[0-9]+/g.test(term.value))
            return this.integer;
        if (term.value === "True" || term.value === "False")
            return this.bool;
        return this.unknown;
    }
    
    public has(term: ConstTerm) {
        return true;
    }
}
