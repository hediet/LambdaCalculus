import * as React from "react";
import * as ReactDOM from "react-dom";
import * as TypeInference from "./typeInference";
import * as Terms from "./terms";
import * as Types from "./types";
import * as Helper from "./helpers";
import * as Parser from "./parser";


class UnitCompleteInput extends React.Component<{
	value: string,
	onChange: __React.FormEventHandler,
}, {}> {
	constructor(props: any) {
		super(props);
		this.state = {};
	}
	render() {
		
		return <div className="dropdown">
			<input {...this.props} ref="inp" autoCorrect={"off"} autoComplete={"off"} autoCapitalize={"none"} className="form-control" placeholder="enter formula" />
			
        </div>;
	}
	
}

interface Output {
    term: Terms.Term;
    map: Helper.Map<Terms.Term, Types.Type> | null;
}


class GuiLineElement {
	public id: number;
	private static idCounter = 0;
	constructor(public input: string, public output: Output) {
		this.id = GuiLineElement.idCounter++;
	}
}

interface GuiState {
	lines: GuiLineElement[];
	currentInput: string; currentOutput: string;
}

export class GUILine extends React.Component<{ line: GuiLineElement,
		onClickRemove: () => void,
		onClickInput: (g: GuiLineElement) => void }, {}> {
	constructor(props: any) {
		super(props);
		this.state = { displayDepth: 0 };
	}
    
    private toHtml(term: Terms.Term, map: Helper.Map<Terms.Term, Types.Type>) {
        
        const type = map.has(term) ? map.get(term).toString() : "";
        
        if (term instanceof Terms.ConstTerm) {
            return <span data-toggle="tooltip" title={ type }>{term.value}</span>;
        }
        else if (term instanceof Terms.VariableTerm) {
            return <span data-toggle="tooltip" title={ type }>{term.name}</span>;
        }
        else if (term instanceof Terms.AbstractionTerm) {
            return <span data-toggle="tooltip" title={ type }>
                { this.toHtml(term.boundVariable, map) }
                {" "}→{" "}
                { this.toHtml(term.body, map) }
            </span>;
        }
        else if (term instanceof Terms.ApplicationTerm) {
            return <span data-toggle="tooltip" title={ type }>
                { this.toHtml(term.func, map) } {" "}
                { this.toHtml(term.argument, map) }
            </span>;
        }
        else if (term instanceof Terms.LetTerm) {
            return <span data-toggle="tooltip" title={ type }>
                let {" "}
                { this.toHtml(term.boundVariable, map) } {" "}
                = {" "}
                { this.toHtml(term.boundTerm, map) } {" "}
                in {" "}
                { this.toHtml(term.body, map) }
            </span>;
        }
    }
    
	render() {
        const output = this.props.line.output;
		const [inp, comment] = this.props.line.input.split("#");
		return <div className="gui-line" >
			{ comment?<h4>{comment}</h4>:"" }
			<button className="btn pull-right close" onClick={() => this.props.onClickRemove()}>×</button>
			<p className="term" style={{ cursor: "pointer" }} onClick={() => this.props.onClickInput(this.props.line) }>> 
                { output.map === null ? inp : this.toHtml(output.term, output.map) }
            </p>
            <pre style={{whiteSpace:"pre-wrap"}}>
                { output.map === null ? "No type" : output.map.get(output.term).toString() }
            </pre>
			<hr />
		</div>
	}
}


export class GUI extends React.Component<{}, GuiState> {
	constructor(props: {}) {
		super(props);
		this.state = { lines: [], currentInput: "", currentOutput: "" };
	}
	addLine(line: GuiLineElement) {
		const lines = this.state.lines.slice();
		lines.unshift(line);
		this.setState({ lines } as any);
	}
	removeLine(index: number) {
		const lines = this.state.lines.slice();
		lines.splice(index, 1);
		this.setState({lines: lines} as any);
	}
	onSubmit(evt: Event) {
		evt.preventDefault();
		const input = this.state.currentInput;
		if (input.trim().length > 0)
        {
            var term = Parser.Parser.parse(input);
            const map = TypeInference.TypeInference.typify(term, new TypeInference.TypeContext(undefined, 
                new TypeInference.CommonConsts()));
            this.addLine(new GuiLineElement(input, { term: term, map: map }))
        } 
        
        this.setState({currentInput: "", currentOutput: ""} as any);
	}
	setInput(input: string) {
		this.setState({currentInput: input} as any);
	}
	onChange(evt: Event) {
		const target = evt.target as HTMLInputElement;
		this.setInput(target.value);
	}

	render() {
		return (
			<div className="container">
				<div className="page-header">
					<h1>Lambda</h1>
				</div>
				<div className="gui-line" >
				<form className="form" onSubmit={this.onSubmit.bind(this)}>
					<UnitCompleteInput onChange={this.onChange.bind(this)} value={this.state.currentInput}/>
				</form>
						<hr />
				</div>
					{this.state.lines.map((line,i) => <GUILine key={line.id} line={line}
						onClickInput={() => this.setInput(line.input) }
						onClickRemove={() => this.removeLine(i) } />) }
				<footer>
					<small>
                        <a href="https://github.com/phiresky/qalc-react">Source code on GitHub</a>
					</small>
				</footer>
			</div>
		);
	}
}






// f => x => f x 2

(window as any).typify = (str) => {
  
    var term = Parser.Parser.parse(str);
    
    const map = TypeInference.TypeInference.typify(term, new TypeInference.TypeContext(undefined, 
        new TypeInference.CommonConsts()));
    
    if (map === null)
        return "No type";
    
    return map.get(term).toString();
};




//const term =  new Terms.AbstractionTerm(f, new Terms.AbstractionTerm(x, new Terms.ApplicationTerm(new Terms.ApplicationTerm(f, x), two)));
//console.log(TypeInference.TypeInfoTermPrinter.print(term, map));

ReactDOM.render(<GUI />, document.getElementById("root"));