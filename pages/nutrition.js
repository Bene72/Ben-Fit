import Layout from '../components/Layout'
import { NutritionClientPage } from '../components/nutrition/NutritionShared'

export const dynamic = 'force-dynamic'

export default function Nutrition(props) {
  return (
    <NutritionClientPage
      clientId={props?.clientId}
      layoutComponent={Layout}
    />
  )
}
