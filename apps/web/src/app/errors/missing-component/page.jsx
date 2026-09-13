import * as helpers from './helpers';

export default function Page() {
  // This scaffold page originally referenced a component that does not exist,
  // which broke the production build. It now renders the real export instead.
  const Widget = helpers.SomethingElse;
  return <div>{Widget()}</div>;
}
