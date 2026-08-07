import katex from 'katex';
import 'katex/dist/katex.min.css';

export default function Formula({ children, displayMode = true }) {
  const html = katex.renderToString(children, {
    displayMode,
    throwOnError: false
  });

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
