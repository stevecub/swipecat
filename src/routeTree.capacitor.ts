/**
 * Capacitor-specific route tree — excludes the /admin route which uses
 * server functions (createServerFn) that cannot run in a static SPA context.
 *
 * This file is manually maintained. If you add new user-facing routes,
 * add them here too.
 */
import { Route as rootRouteImport } from './routes/__root'
import { Route as PrivacyRouteImport } from './routes/privacy'
import { Route as LikedRouteImport } from './routes/liked'
import { Route as CategoriesRouteImport } from './routes/categories'
import { Route as AboutRouteImport } from './routes/about'
import { Route as IndexRouteImport } from './routes/index'
import { Route as ProductIdRouteImport } from './routes/product.$id'

const PrivacyRoute = PrivacyRouteImport.update({
  id: '/privacy',
  path: '/privacy',
  getParentRoute: () => rootRouteImport,
} as any)

const LikedRoute = LikedRouteImport.update({
  id: '/liked',
  path: '/liked',
  getParentRoute: () => rootRouteImport,
} as any)

const CategoriesRoute = CategoriesRouteImport.update({
  id: '/categories',
  path: '/categories',
  getParentRoute: () => rootRouteImport,
} as any)

const AboutRoute = AboutRouteImport.update({
  id: '/about',
  path: '/about',
  getParentRoute: () => rootRouteImport,
} as any)

const IndexRoute = IndexRouteImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRouteImport,
} as any)

const ProductIdRoute = ProductIdRouteImport.update({
  id: '/product/$id',
  path: '/product/$id',
  getParentRoute: () => rootRouteImport,
} as any)

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/about': typeof AboutRoute
  '/categories': typeof CategoriesRoute
  '/liked': typeof LikedRoute
  '/privacy': typeof PrivacyRoute
  '/product/$id': typeof ProductIdRoute
}

export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/about': typeof AboutRoute
  '/categories': typeof CategoriesRoute
  '/liked': typeof LikedRoute
  '/privacy': typeof PrivacyRoute
  '/product/$id': typeof ProductIdRoute
}

export interface FileRoutesById {
  __root__: typeof rootRouteImport
  '/': typeof IndexRoute
  '/about': typeof AboutRoute
  '/categories': typeof CategoriesRoute
  '/liked': typeof LikedRoute
  '/privacy': typeof PrivacyRoute
  '/product/$id': typeof ProductIdRoute
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths:
    | '/'
    | '/about'
    | '/categories'
    | '/liked'
    | '/privacy'
    | '/product/$id'
  fileRoutesByTo: FileRoutesByTo
  to:
    | '/'
    | '/about'
    | '/categories'
    | '/liked'
    | '/privacy'
    | '/product/$id'
  id:
    | '__root__'
    | '/'
    | '/about'
    | '/categories'
    | '/liked'
    | '/privacy'
    | '/product/$id'
  fileRoutesById: FileRoutesById
}

export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  AboutRoute: typeof AboutRoute
  CategoriesRoute: typeof CategoriesRoute
  LikedRoute: typeof LikedRoute
  PrivacyRoute: typeof PrivacyRoute
  ProductIdRoute: typeof ProductIdRoute
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  AboutRoute: AboutRoute,
  CategoriesRoute: CategoriesRoute,
  LikedRoute: LikedRoute,
  PrivacyRoute: PrivacyRoute,
  ProductIdRoute: ProductIdRoute,
}

export const routeTree = rootRouteImport
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()
