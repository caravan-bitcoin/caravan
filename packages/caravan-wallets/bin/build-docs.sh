#!/bin/bash -ex
directory=docs
branch=gh-pages

build_command() {
  # generate the jsdoc
  jsdoc -c bin/docs-config.json -d $directory -r src README.md
  # add nojekyll so github pages builds correctly
  touch "$directory/.nojekyll"
}

echo -e "\033[0;32mDeleting old content...\033[0m"
rm -rf $directory

echo -e "\033[0;32mChecking out $branch....\033[0m"
git worktree add $directory $branch

echo -e "\033[0;32mGenerating docs...\033[0m"
build_command

echo -e "\033[0;32mDeploying $branch branch...\033[0m"
cd $directory &&
  git add --all &&
  git commit -m "Deploy updates" &&
  git push origin $branch

echo -e "\033[0;32mCleaning up...\033[0m"
git worktree remove $directory