// The site footer: the o!TR copyright line, then the links set in
// quartz.config.yaml. It replaces Quartz's footer plugin, whose first line
// always credits Quartz. Quartz loads this file as is, so it is plain
// JavaScript and imports only preact, which Quartz itself provides.
import { h } from "preact"

export const OtrFooter = (opts) => {
  const links = Object.entries(opts?.links ?? {})
  const Footer = ({ displayClass }) =>
    h("footer", { class: displayClass ?? "" }, [
      h("p", null, "osu! Tournament Rating © 2025"),
      h(
        "ul",
        null,
        links.map(([text, href]) => h("li", null, h("a", { href }, text))),
      ),
    ])

  // The same styles as Quartz's footer.
  Footer.css = `
footer {
  text-align: left;
  margin-bottom: 4rem;
  opacity: 0.7;
}
footer ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: row;
  gap: 1rem;
  margin-top: -1rem;
}`
  return Footer
}
