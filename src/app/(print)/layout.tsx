/**
 * Layout per le pagine di stampa (documento senza sidebar/navigazione).
 * Il documento è volutamente su carta bianca a prescindere dal tema UI.
 */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-[#101827] [color-scheme:light]">
      {children}
    </div>
  );
}
