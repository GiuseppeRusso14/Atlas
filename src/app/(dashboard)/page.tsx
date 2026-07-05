import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Placeholder: la dashboard vera (KPI, grafici, feed, alert) arriva nella milestone 9.
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle>Benvenuto</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          I moduli Clienti, Progetti, Task, Preventivi e Ore sono in
          costruzione: usa la sidebar per navigare man mano che vengono
          completati.
        </CardContent>
      </Card>
    </div>
  );
}
