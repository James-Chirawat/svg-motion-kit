export function Comment({ comment }: { comment: { body: string } }) {
  return <div className="prose" dangerouslySetInnerHTML={{ __html: comment.body }} />;
}
