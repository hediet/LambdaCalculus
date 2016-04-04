import { Equatable, Helper } from "./helpers";

export abstract class Term implements Equatable<Term> {
    public abstract accept<TArg, TResult>(visitor: TermVisitor<TArg, TResult>, arg: TArg): TResult;
    
    public abstract equals(other: Term): boolean;
    public abstract toString(): string;
}

export interface TermVisitor<TArg, TResult> {
    visitVariable(term: VariableTerm, arg: TArg): TResult;
    visitConst(term: ConstTerm, arg: TArg): TResult;
    visitApplication(term: ApplicationTerm, arg: TArg): TResult;
    visitAbstraction(term: AbstractionTerm, arg: TArg): TResult;
    visitLet(term: LetTerm, arg: TArg): TResult;
}

export class ConstTerm extends Term {
    public readonly value: string;
    
    constructor(value: string) {
        super();
        
        this.value = value;
    }
    
    public accept<TArg, TResult>(visitor: TermVisitor<TArg, TResult>, arg: TArg): TResult {
        return visitor.visitConst(this, arg);
    }
    
    public equals(other: Term): boolean {
        return other instanceof ConstTerm && this.value === other.value;
    }
    
    public toString(): string {
        return this.value;
    }
}

export class VariableTerm extends Term {
    public readonly name: string;
    
    constructor(name: string) {
        super();
        
        this.name = name;
    }
    
    public accept<TArg, TResult>(visitor: TermVisitor<TArg, TResult>, arg: TArg): TResult {
        return visitor.visitVariable(this, arg);
    }
    
    public equals(other: Term): boolean {
        return other instanceof VariableTerm && this.name === other.name;
    }
    
    public toString(): string {
        return this.name;
    }
}


export class ApplicationTerm extends Term {
    public readonly func: Term;
    public readonly argument: Term;
    
    constructor(func: Term, argument: Term) {
        super();
        
        this.func = func;
        this.argument = argument;
    }
    
    public accept<TArg, TResult>(visitor: TermVisitor<TArg, TResult>, arg: TArg): TResult {
        return visitor.visitApplication(this, arg);
    }
    
    public equals(other: Term): boolean {
        return other instanceof ApplicationTerm && this.func.equals(other.func) && this.argument.equals(other.argument);
    }
    
    public toString(): string {
        return `${this.func.toString()} ${this.argument.toString()}`;
    }
}

export class AbstractionTerm extends Term {
    public readonly boundVariable: VariableTerm;
    public readonly body: Term;
    
    constructor(boundVariable: VariableTerm, body: Term) {
        super();
        
        this.boundVariable = boundVariable;
        this.body = body;
    }
    
    public accept<TArg, TResult>(visitor: TermVisitor<TArg, TResult>, arg: TArg): TResult {
        return visitor.visitAbstraction(this, arg);
    }
    
    public equals(other: Term): boolean {
        return other instanceof AbstractionTerm && this.boundVariable.equals(other.boundVariable) && this.body.equals(other.body);
    }
    
    public toString(): string {
        return `${this.boundVariable.toString()} → ${this.body.toString()}`;
    }
}

export class LetTerm extends Term {
    public readonly boundVariable: VariableTerm;
    public readonly boundTerm: Term;
    public readonly body: Term;
    
    constructor(boundVariable: VariableTerm, boundTerm: Term, body: Term) {
        super();
        
        this.boundVariable = boundVariable;
        this.boundTerm = boundTerm;
        this.body = body;
    }
    
    public accept<TArg, TResult>(visitor: TermVisitor<TArg, TResult>, arg: TArg): TResult {
        return visitor.visitLet(this, arg);
    }
    
    public equals(other: Term): boolean {
        return other instanceof LetTerm && this.boundVariable.equals(other.boundVariable) 
            && this.boundTerm.equals(other.boundTerm) && this.body.equals(other.body);
    }
    
    public toString(): string {
        return `let ${this.boundTerm.toString()} = ${this.boundVariable.toString()} in ${this.body.toString()}`;
    }
}



export class BoundVariables implements TermVisitor<void, VariableTerm[]> {
    
    public static get(term: Term): VariableTerm[] {
        const v = new BoundVariables();
        return term.accept(v, null);
    }
    
    private BoundVariables() { }
    
    public visitVariable(term: VariableTerm): VariableTerm[] { return []; }
    
    public visitConst(term: ConstTerm): VariableTerm[] { return []; }
    
    public visitApplication(term: ApplicationTerm): VariableTerm[] {
        return Helper.unique(term.func.accept(this, null)
            .concat(term.argument.accept(this, null)), x => x.name);
    }
    
    public visitAbstraction(term: AbstractionTerm): VariableTerm[] {
        return Helper.unique([ term.boundVariable ].concat(term.body.accept(this, null)), x => x.name);
    }
    
    public visitLet(term: LetTerm): VariableTerm[] {
        return Helper.unique([ term.boundVariable ]
            .concat(term.boundTerm.accept(this, null))
            .concat(term.body.accept(this, null)), x => x.name);
    }
}

export class FreeVariables implements TermVisitor<void, VariableTerm[]> {
    
    public static get(term: Term): VariableTerm[] {
        const v = new FreeVariables();
        return term.accept(v, null);
    }
    
    private FreeVariables() { }
    
    public visitVariable(term: VariableTerm): VariableTerm[] { return [ term ]; }
    
    public visitConst(term: ConstTerm): VariableTerm[] { return []; }
    
    public visitApplication(term: ApplicationTerm): VariableTerm[] {
        return Helper.unique(
            term.func.accept(this, null)
            .concat(term.argument.accept(this, null)), x => x.name);
    }
    
    public visitAbstraction(term: AbstractionTerm): VariableTerm[] {
        return Helper.without(term.body.accept(this, null), term.boundVariable);
    }
    
    public visitLet(term: LetTerm): VariableTerm[] {
        return Helper.unique(
            term.boundTerm.accept(this, null)
            .concat(Helper.without(term.body.accept(this, null), term.boundVariable)), x => x.name);
    }
}
