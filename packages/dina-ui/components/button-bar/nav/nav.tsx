import { LanguageSelector, useAccount } from "common-ui";
import Link from "next/link";
import React from "react";
import { DinaMessage } from "../../../intl/dina-ui-intl";

export function Nav() {
  return (
    <header className="py-3">
      <div id="wb-bnr" className="container">
        <div className="row d-flex">
          <div
            className="brand col-5 col-md-4"
            property="publisher"
            typeof="GovernmentOrganization"
          >
            <img
              src="https://www.canada.ca/etc/designs/canada/cdts/gcweb/v4_0_32/assets/sig-blk-en.svg"
              alt=""
              property="logo"
            />
            <span className="wb-inv" property="name">
              <DinaMessage id="governmentOfCanada" />
            </span>
            <meta property="areaServed" typeof="Country" content="Canada" />
          </div>
          <section id="wb-lng" className="text-right ml-auto col-7 col-md-8">
            <ul className="list-inline ">
              <li className="list-inline-item mx-2">
                <LanguageSelector />
              </li>
              <li className="list-inline-item mx-2">
                <NavbarUserControl />
              </li>
              <li className="list-inline-item mx-2 my-auto">
                <a
                  className="btn btn-info"
                  href="https://github.com/AAFC-BICoE/dina-planning/issues/new?labels=demo%20feedback"
                >
                  <DinaMessage id="feedbackButtonText" />
                </a>
              </li>
            </ul>
          </section>
        </div>
      </div>
      <div className="app-bar">
        <div className="container">
          <ul className="list-inline d-flex m-0">
            <style>
              {`
                .dropdown:hover .dropdown-menu {
                    display: block;
                }
                .dropdown a.nav-link {
                  color: rgb(232, 230, 227);
                }
              `}
            </style>
            <li className="list-inline-item mr-4">
              <Link href="/">
                <a className="app-name px-0">
                  <DinaMessage id="appTitle" />
                </a>
              </Link>
            </li>
            <li className="list-inline-item my-auto">
              <NavObjectStoreDropdown />
            </li>
            <li className="list-inline-item my-auto">
              <NavAgentsDropdown />
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}

/** Object Store links. */
function NavObjectStoreDropdown() {
  return (
    <div className="dropdown">
      <a className="nav-link dropdown-toggle" href="#">
        <DinaMessage id="objectStoreTitle" />
      </a>
      <div className="dropdown-menu m-0">
        <Link href="/object-store/upload">
          <a className="dropdown-item">
            <DinaMessage id="uploadPageTitle" />
          </a>
        </Link>
        <Link href="/object-store/object/list">
          <a className="dropdown-item">
            <DinaMessage id="objectListTitle" />
          </a>
        </Link>
        <Link href="/object-store/managedAttributesView/listView">
          <a className="dropdown-item">
            <DinaMessage id="managedAttributeListTitle" />
          </a>
        </Link>
        <Link href="/object-store/object-subtype/list">
          <a className="dropdown-item">
            <DinaMessage id="objectSubtypeListTitle" />
          </a>
        </Link>
        <Link href="/object-store/revisions-by-user">
          <a className="dropdown-item">
            <DinaMessage id="revisionsByUserPageTitle" />
          </a>
        </Link>
      </div>
    </div>
  );
}

/** Agents links. */
function NavAgentsDropdown() {
  return (
    <div className="dropdown">
      <a className="nav-link dropdown-toggle" href="#">
        <DinaMessage id="agentsSectionTitle" />
      </a>
      <div className="dropdown-menu m-0">
        <Link href="/person/list">
          <a className="dropdown-item">
            <DinaMessage id="personListTitle" />
          </a>
        </Link>
      </div>
    </div>
  );
}

/** Shows the logged-in user and the logout button. */
function NavbarUserControl() {
  const { authenticated, initialized, logout, username } = useAccount();

  return (
    <div className="d-flex">
      {initialized && authenticated ? (
        <>
          {username && (
            <span className="mr-2 my-auto">
              <DinaMessage id="loggedInAsUser" values={{ name: username }} />
            </span>
          )}
          <button
            type="button"
            className="btn btn-dark logout-button"
            onClick={() => logout()}
          >
            <DinaMessage id="logoutBtn" />
          </button>
        </>
      ) : null}
    </div>
  );
}

export function Footer() {
  return (
    <footer id="wb-info" className="my-3" style={{ zIndex: 0 }}>
      <div className="brand">
        <div className="container">
          <div className="row">
            <nav className="col-md-10 ftr-urlt-lnk">
              <ul>
                <li>
                  <a href="https://www.canada.ca/en/contact.html">
                    Contact information
                  </a>
                </li>
                <li>
                  <a href="https://www.canada.ca/en/transparency/terms.html">
                    Terms and conditions
                  </a>
                </li>
                <li>
                  <a href="https://www.canada.ca/en/transparency/privacy.html">
                    Privacy
                  </a>
                </li>
              </ul>
            </nav>
            <div className="col-6 col-md-3 col-lg-2 text-right">
              <img
                src="https://www.canada.ca/etc/designs/canada/cdts/gcweb/v4_0_32/assets/wmms-blk.svg"
                alt="Symbol of the Government of Canada"
              />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}