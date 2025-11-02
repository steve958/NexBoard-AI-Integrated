import BoardClient from "./BoardClient";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BoardClient boardId={id} />;
}
