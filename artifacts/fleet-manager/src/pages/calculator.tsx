import { Layout } from "@/components/layout";
import { useEffect, useState } from "react";
import { Delete } from "lucide-react";

export default function Calculator() {
  const [display, setDisplay] = useState(() => localStorage.getItem("fleet-calculator-display") || "0");
  const [equation, setEquation] = useState(() => localStorage.getItem("fleet-calculator-equation") || "");

  useEffect(() => {
    localStorage.setItem("fleet-calculator-display", display);
    localStorage.setItem("fleet-calculator-equation", equation);
  }, [display, equation]);

  const append = (val: string) => {
    if (display === '0' && val !== '.') setDisplay(val);
    else setDisplay(display + val);
  };

  const calculate = () => {
    try {
      // safe eval alternative for simple calc
      const res = new Function('return ' + display)();
      setEquation(display + ' =');
      setDisplay(String(res));
    } catch(e) {
      setDisplay('Error');
    }
  };

  const clear = () => {
    setDisplay('0');
    setEquation('');
    localStorage.removeItem("fleet-calculator-display");
    localStorage.removeItem("fleet-calculator-equation");
  };

  const backspace = () => {
    if (display.length === 1) setDisplay('0');
    else setDisplay(display.slice(0, -1));
  };

  const buttons = [
    ['C', '⌫', '%', '/'],
    ['7', '8', '9', '*'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['0', '00', '.', '=']
  ];

  return (
    <Layout>
      <div className="h-[calc(100vh-80px)] flex flex-col bg-card">
        <div className="pt-12 px-6 flex-1 flex flex-col justify-end pb-8">
          <div className="text-right text-muted-foreground font-medium text-lg h-8 mb-2">
            {equation}
          </div>
          <div className="text-right text-6xl font-black tracking-tighter text-foreground overflow-x-auto no-scrollbar">
            {display}
          </div>
        </div>
        <div className="bg-muted/50 p-6 rounded-t-3xl border-t border-border">
          <div className="grid grid-cols-4 gap-4">
            {buttons.flat().map((btn, i) => {
              const isOp = ['/', '*', '-', '+', '='].includes(btn);
              const isAction = ['C', '⌫', '%'].includes(btn);
              return (
                <button
                  key={i}
                  onClick={() => {
                    if (btn === 'C') clear();
                    else if (btn === '⌫') backspace();
                    else if (btn === '=') calculate();
                    else append(btn);
                  }}
                  className={`aspect-square rounded-2xl text-2xl font-bold flex items-center justify-center transition-transform active:scale-90
                    ${isOp ? 'bg-primary text-primary-foreground shadow-sm' : 
                      isAction ? 'bg-secondary text-secondary-foreground shadow-sm' : 
                      'bg-background border border-border shadow-sm text-foreground'}`}
                >
                  {btn === '⌫' ? <Delete size={24} /> : btn}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}
