const ALIGN_TH: Record<string, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

const ALIGN_TD: Record<string, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

export function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
}) {
  return (
    <th className={`t-meta py-3 px-2 ${ALIGN_TH[align]} whitespace-nowrap`}>
      {children}
    </th>
  );
}

export function Td({
  children,
  align = "left",
  mono = false,
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
  mono?: boolean;
}) {
  return (
    <td
      className={`py-3 px-2 align-baseline ${ALIGN_TD[align]} whitespace-nowrap ${
        mono ? "font-mono tabular-nums" : "t-body"
      }`}
    >
      {children}
    </td>
  );
}
