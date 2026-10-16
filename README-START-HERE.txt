AND FC WEBSITE WITH FREE PAGES CMS EDITOR

This version is designed for GitHub + Pages CMS + Netlify.
IMPORTANT: Netlify Drop alone is NOT enough for automatic CMS publishing.

1. Create a free GitHub account at github.com.
2. Create a new PUBLIC repository named andfc-website.
3. Upload all files and folders from THIS extracted folder to the root of the repository. Include the hidden .pages.yml file. The easiest method is GitHub's Add file > Upload files. If hidden files do not upload, create .pages.yml directly in GitHub and paste its contents.
4. In the repository, go to Settings > Pages if you prefer GitHub Pages hosting, or connect repository to Netlify for free continuous deployment: app.netlify.com > Add new project > Import an existing project > GitHub > choose andfc-website > publish directory '.' (root), no build command.
5. Visit app.pagescms.org, sign in with GitHub and install the Pages CMS GitHub app for your andfc-website repository.
6. Select the repository in Pages CMS. You can edit training, news, fixtures, photos, events and club details. Click Save.
7. Netlify will automatically republish when the repository changes.

AUTOMATIC UPDATES: A GitHub Actions workflow included in .github/workflows/update-indexes.yml automatically updates the news, fixture, gallery and event indexes after you save an entry. Allow a minute or two for the update and Netlify deployment. In GitHub Settings > Actions > General, ensure workflow permissions allow Read and write permissions if needed. The repository must use the main branch.

PRIVACY: Do not publish children's photos without proper consent; do not upload sensitive player records to a public GitHub repository. Contact is via email link, not an active form.

CLUB SHOP
The Shop section is on the homepage. After connecting Pages CMS, choose Club Shop Products to add each item with an image, price, sizes and description. Optionally add an official supplier ordering URL. If no ordering URL is supplied, customers can email the club to enquire. This website does not process payments.
The official club badge is now included. The slogan is Ability Not Disability.

OFFICIAL CLUB SHOP: https://empirekits.co.uk/collections/antrim-newtownabbey-disability-fc
The Shop link on the website directs customers to Empire Kits for purchases.
