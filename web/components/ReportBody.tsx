import Markdown from "react-markdown";
import { Disclaimer } from "./Card";

export function ReportBody({ markdown }: { markdown: string }) {
  return (
    <>
      <div className="report">
        <Markdown>{markdown}</Markdown>
      </div>
      <Disclaimer />
    </>
  );
}
