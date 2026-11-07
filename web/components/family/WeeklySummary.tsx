import type { Report } from "@/lib/types";
import { Card, Empty, Skeleton } from "../Card";
import { fmtDay } from "../format";
import { ReportBody } from "../ReportBody";

export function WeeklySummary({ report, loading }: { report?: Report; loading: boolean }) {
  return (
    <Card
      title="Weekly summary"
      action={report && <span className="text-[13px] text-muted">Week of {fmtDay(Date.parse(report.rangeStart))}</span>}
    >
      {report ? (
        <ReportBody markdown={report.markdown} />
      ) : loading ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ) : (
        <Empty>The first weekly summary arrives on Monday morning.</Empty>
      )}
    </Card>
  );
}
