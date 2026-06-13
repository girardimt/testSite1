import { Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { RowShimmer } from '../lib/ui'
import { AppLayout } from './layout/AppLayout'
import { DashboardPage } from '../pages/DashboardPage'
import { WorkItemsPage } from '../pages/WorkItemsPage'
import { WorkItemDetailPage } from '../pages/WorkItemDetailPage'
import { PlanningPage } from '../pages/PlanningPage'
import { BlockersPage } from '../pages/BlockersPage'
import { LinksPage } from '../pages/LinksPage'
import { ReleasesViewPage } from '../pages/ReleasesViewPage'
import { CategoriesPage } from '../pages/CategoriesPage'
import { BlockerTypesPage } from '../pages/BlockerTypesPage'
import { PeoplePage } from '../pages/PeoplePage'
import { ReleasesMasterDataPage } from '../pages/ReleasesMasterDataPage'
import { NotFoundPage } from '../pages/NotFoundPage'

export const AppRouter = () => (
  <AppLayout>
    <Suspense fallback={<div className="page"><RowShimmer /></div>}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/work-items" element={<WorkItemsPage />} />
        <Route path="/work-items/:id" element={<WorkItemDetailPage />} />
        <Route path="/planning" element={<PlanningPage />} />
        <Route path="/blockers" element={<BlockersPage />} />
        <Route path="/links" element={<LinksPage />} />
        <Route path="/releases" element={<ReleasesViewPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/blocker-types" element={<BlockerTypesPage />} />
        <Route path="/people" element={<PeoplePage />} />
        <Route path="/releases-md" element={<ReleasesMasterDataPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  </AppLayout>
)
