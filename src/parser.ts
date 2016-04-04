import { Term, ConstTerm, VariableTerm, AbstractionTerm, ApplicationTerm, LetTerm, FreeVariables, BoundVariables, TermVisitor } from "./terms";


class Logger {
    
    public logBodyIsMissing(region: TextRegion) {
        
    }
    
    public logParenthesisIsMissing(region: TextRegion) {
        
    }
}


function setRegion(term: Term, region: TextRegion) {
    (<any>term).region = region;
}
    
export class TextRegion {

    public static getRegion(term: Term): TextRegion {
        return (<any>term).region;
    }
    
    public readonly start: number; // 1-based
    public readonly end: number; // 1-based
    
    public get length(): number { return this.end - this.start; }
    
    constructor(start: number, end: number) {
        this.start = start;
        this.end = end;
    }
}

enum TokenType { Identifier, RightArrow, OpeningParen, ClosingParen, LetKeyword, InKeyword, Equals, End, Invalid }

interface Token {
    readonly type: TokenType;
    readonly text: string;
    readonly region: TextRegion;
}

class CharStream {

    private readonly str: string;
    private pos: number = 0;
    public get position() { return this.pos + 1; } // 1 based

    constructor(str: string) {
        this.str = str;
    }

    public peekChar(): string {
        if (this.pos >= this.str.length)
            return "";
        return this.str[this.pos];
    }

    public tryReadChar(c: string): boolean {
        if (this.peekChar() != c) 
            return false;
        
        this.readChar();    
        return true;
    }

    public readChar(): string {
        return this.str[this.pos++];
    }

}

class Tokenizer {
    
    private readonly stream: CharStream;
    private curTok: Token|null;
    
    constructor(str: string) {
        this.stream = new CharStream(str);
        this.curTok = this.read();
    }
    
    public peek(): Token {
        if (this.curTok == null)
            this.curTok = this.read();
        return this.curTok;
    }
    
    public static readonly alphabet = "abcdefghijklmnopqrstuvwxyz";
    public static readonly fullAlphabet = Tokenizer.alphabet +Tokenizer.alphabet.toUpperCase();
    public static readonly numbers = "1234567890";
    public static readonly identifierChars = Tokenizer.fullAlphabet + Tokenizer.numbers;
    
    public read(): Token {
        if (this.curTok != null) {
            var tok = this.curTok;
            this.curTok = null;
            return tok;
        }
        
        const startPos = this.stream.position;
        var c = this.stream.peekChar();

        while (this.stream.peekChar() !== "" && " \t\n\r".indexOf(this.stream.peekChar()) !== -1)
            this.stream.readChar();
            
        if (c === "")
            return { type: TokenType.End, text: "", region: new TextRegion(startPos, startPos) };   
        
        var c = this.stream.readChar();

        if (c === "(")
            return { type: TokenType.OpeningParen, text: c, region: new TextRegion(startPos, this.stream.position) };  
        if (c === ")")
            return { type: TokenType.ClosingParen, text: c, region: new TextRegion(startPos, this.stream.position) };  
        if (c === "=" || c === "-") {
            if (!this.stream.tryReadChar(">")) {
                if (c === "=")
                    return { type: TokenType.Equals, text: c, region: new TextRegion(startPos, this.stream.position) };
                
                return { type: TokenType.Invalid, text: c, region: new TextRegion(startPos, this.stream.position) };
            }
            c += ">";
            return { type: TokenType.RightArrow, text: c, region: new TextRegion(startPos, this.stream.position) };
        }

        if (Tokenizer.identifierChars.indexOf(c) !== -1) {
            while (this.stream.peekChar() !== "" && Tokenizer.identifierChars.indexOf(this.stream.peekChar()) !== -1)
                c += this.stream.readChar();
            
            if (c === "in")
                return { type: TokenType.InKeyword, text: c, region: new TextRegion(startPos, this.stream.position) };
            else if (c === "let")
                return { type: TokenType.LetKeyword, text: c, region: new TextRegion(startPos, this.stream.position) };
                
            return { type: TokenType.Identifier, text: c, region: new TextRegion(startPos, this.stream.position) };
        }
        
        return { type: TokenType.Invalid, text: c, region: new TextRegion(startPos, this.stream.position) };
    }
}


export class Parser {
    
    public static parse(str: string): Term {
        return new Parser().parseTerm(new Tokenizer(str));
    }
    
    private parseTerm(t: Tokenizer): Term {
        
        let base: Term = null;
        
        while (true) {
            var tp = t.peek().type;
            if (tp === TokenType.End || tp === TokenType.ClosingParen || tp == TokenType.InKeyword)
                break;
            
            const term = this.parseTerm1(t);
            if (base === null)
                base = term;
            else
                base = new ApplicationTerm(base, term);
        }
        
        return base;
    }
    
    private parseTerm1(t: Tokenizer): Term {
        const tok = t.peek();
        if (tok.type === TokenType.OpeningParen)
            return this.parseParen(t);
        if (tok.type === TokenType.LetKeyword)
            return this.parseLet(t);
        if (tok.type === TokenType.Identifier) {
            t.read();
            if (t.peek().type === TokenType.RightArrow) {
                const variable = new VariableTerm(tok.text);
                t.read();
                const body = this.parseTerm(t);
                
                return new AbstractionTerm(variable, body);
            }
                
            
            if (Tokenizer.numbers.indexOf(tok.text[0]) !== -1 || Tokenizer.alphabet.toUpperCase().indexOf(tok.text[0]) !== -1)
                return new ConstTerm(tok.text);
            return new VariableTerm(tok.text);
        }
        
        throw "Invalid token";
    }
    
    private parseLet(t: Tokenizer): Term {
        const letToken = t.read();
        if (letToken.type != TokenType.LetKeyword)
            throw "error";
            
        const variable = this.parseTerm1(t);
        
        if (!(variable instanceof VariableTerm))
            throw "error: Term must be variable";
        else {
            const eqToken = t.read();
            if (eqToken.type !== TokenType.Equals)
                throw "expected equals";
                
            const boundTerm = this.parseTerm(t);
            
            const inToken = t.read();
            if (inToken.type !== TokenType.InKeyword)
                throw "expected in";
            
            const body = this.parseTerm(t);
            
            return new LetTerm(variable, boundTerm, body);
        }
    }
    
    private parseParen(t: Tokenizer): Term {
        var tok = t.read();
        if (tok.type != TokenType.OpeningParen)
            throw "error";
        
        var term = this.parseTerm(t);
        
        var tok2 = t.peek();
        if (tok2.type != TokenType.ClosingParen)
            throw "missing closing parenthesis";
        t.read();
        
        return term;
    }
    
}