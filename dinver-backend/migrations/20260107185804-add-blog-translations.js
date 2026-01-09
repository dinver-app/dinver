'use strict';

/**
 * Migration: Add BlogTranslation table and restructure Blog model
 *
 * This migration:
 * 1. Creates BlogTranslations table
 * 2. Adds blogTopicId column to Blogs table
 * 3. Migrates existing blog data to translations
 * 4. Consolidates HR/EN blogs from same topic into single blog with translations
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    // 1. Create BlogTranslations table (only if it doesn't exist)
    if (!tables.includes('BlogTranslations')) {
      await queryInterface.createTable('BlogTranslations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      blogId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Blogs',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      language: {
        type: Sequelize.STRING(5),
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      slug: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      excerpt: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      metaTitle: {
        type: Sequelize.STRING(60),
        allowNull: true,
      },
      metaDescription: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      keywords: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      readingTimeMinutes: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      });

      // Add indexes
      await queryInterface.addIndex('BlogTranslations', ['blogId']);
      await queryInterface.addIndex('BlogTranslations', ['language']);
      await queryInterface.addIndex('BlogTranslations', ['blogId', 'language'], {
        unique: true,
        name: 'blog_translation_unique_language',
      });
    }

    // 2. Add blogTopicId column to Blogs table (only if it doesn't exist)
    const blogsTable = await queryInterface.describeTable('Blogs');
    if (blogsTable.blogTopicId) {
      console.log('blogTopicId column already exists, skipping data migration');
      return;
    }
    await queryInterface.addColumn('Blogs', 'blogTopicId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'BlogTopics',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addIndex('Blogs', ['blogTopicId']);

    // 3. Migrate existing data
    // For each BlogTopic with HR and EN blogs, we need to:
    // - Keep the HR blog as the main blog
    // - Create translations for both HR and EN
    // - Delete the EN blog (if it's a duplicate)
    // - Update blogTopicId on the main blog

    // First, migrate standalone blogs (not from topics) to translations
    const [standaloneBlogs] = await queryInterface.sequelize.query(`
      SELECT b.id, b.title, b.slug, b.content, b.excerpt, b.language,
             b."metaTitle", b."metaDescription", b.keywords, b.tags, b."readingTimeMinutes"
      FROM "Blogs" b
      WHERE NOT EXISTS (
        SELECT 1 FROM "BlogTopics" bt
        WHERE bt."blogIdHr" = b.id OR bt."blogIdEn" = b.id
      )
      AND b."deletedAt" IS NULL
    `);

    for (const blog of standaloneBlogs) {
      // Create translation for standalone blog
      await queryInterface.sequelize.query(`
        INSERT INTO "BlogTranslations"
        (id, "blogId", language, title, slug, content, excerpt, "metaTitle", "metaDescription", keywords, tags, "readingTimeMinutes", "createdAt", "updatedAt")
        VALUES (
          gen_random_uuid(),
          '${blog.id}',
          '${blog.language || 'hr-HR'}',
          $1,
          '${blog.slug}',
          $2,
          $3,
          $4,
          $5,
          $6::text[],
          $7::text[],
          ${blog.readingTimeMinutes || 'NULL'},
          NOW(),
          NOW()
        )
      `, {
        bind: [
          blog.title,
          blog.content,
          blog.excerpt,
          blog.metaTitle,
          blog.metaDescription,
          blog.keywords || [],
          blog.tags || [],
        ]
      });
    }

    // Now handle blogs from topics
    const [topics] = await queryInterface.sequelize.query(`
      SELECT bt.id as topic_id, bt."blogIdHr", bt."blogIdEn"
      FROM "BlogTopics" bt
      WHERE bt."blogIdHr" IS NOT NULL OR bt."blogIdEn" IS NOT NULL
    `);

    for (const topic of topics) {
      let mainBlogId = topic.blogIdHr || topic.blogIdEn;

      // Get HR blog data
      if (topic.blogIdHr) {
        const [hrBlogs] = await queryInterface.sequelize.query(`
          SELECT id, title, slug, content, excerpt, "metaTitle", "metaDescription", keywords, tags, "readingTimeMinutes"
          FROM "Blogs" WHERE id = '${topic.blogIdHr}' AND "deletedAt" IS NULL
        `);

        if (hrBlogs.length > 0) {
          const hrBlog = hrBlogs[0];
          mainBlogId = hrBlog.id;

          // Create HR translation
          await queryInterface.sequelize.query(`
            INSERT INTO "BlogTranslations"
            (id, "blogId", language, title, slug, content, excerpt, "metaTitle", "metaDescription", keywords, tags, "readingTimeMinutes", "createdAt", "updatedAt")
            VALUES (
              gen_random_uuid(),
              '${mainBlogId}',
              'hr-HR',
              $1,
              '${hrBlog.slug}',
              $2,
              $3,
              $4,
              $5,
              $6::text[],
              $7::text[],
              ${hrBlog.readingTimeMinutes || 'NULL'},
              NOW(),
              NOW()
            )
          `, {
            bind: [
              hrBlog.title,
              hrBlog.content,
              hrBlog.excerpt,
              hrBlog.metaTitle,
              hrBlog.metaDescription,
              hrBlog.keywords || [],
              hrBlog.tags || [],
            ]
          });
        }
      }

      // Get EN blog data and create translation
      if (topic.blogIdEn && topic.blogIdEn !== topic.blogIdHr) {
        const [enBlogs] = await queryInterface.sequelize.query(`
          SELECT id, title, slug, content, excerpt, "metaTitle", "metaDescription", keywords, tags, "readingTimeMinutes", "featuredImage"
          FROM "Blogs" WHERE id = '${topic.blogIdEn}' AND "deletedAt" IS NULL
        `);

        if (enBlogs.length > 0 && mainBlogId) {
          const enBlog = enBlogs[0];

          // Create EN translation pointing to main blog
          await queryInterface.sequelize.query(`
            INSERT INTO "BlogTranslations"
            (id, "blogId", language, title, slug, content, excerpt, "metaTitle", "metaDescription", keywords, tags, "readingTimeMinutes", "createdAt", "updatedAt")
            VALUES (
              gen_random_uuid(),
              '${mainBlogId}',
              'en-US',
              $1,
              '${enBlog.slug}',
              $2,
              $3,
              $4,
              $5,
              $6::text[],
              $7::text[],
              ${enBlog.readingTimeMinutes || 'NULL'},
              NOW(),
              NOW()
            )
          `, {
            bind: [
              enBlog.title,
              enBlog.content,
              enBlog.excerpt,
              enBlog.metaTitle,
              enBlog.metaDescription,
              enBlog.keywords || [],
              enBlog.tags || [],
            ]
          });

          // Soft delete the EN blog (it's now merged into main blog)
          if (topic.blogIdEn !== mainBlogId) {
            await queryInterface.sequelize.query(`
              UPDATE "Blogs" SET "deletedAt" = NOW() WHERE id = '${topic.blogIdEn}'
            `);
          }
        }
      }

      // Update the main blog with blogTopicId
      if (mainBlogId) {
        await queryInterface.sequelize.query(`
          UPDATE "Blogs" SET "blogTopicId" = '${topic.topic_id}' WHERE id = '${mainBlogId}'
        `);
      }
    }

    console.log('Migration completed: Blog translations created and data migrated');
  },

  async down(queryInterface, Sequelize) {
    // Remove blogTopicId from Blogs
    const blogsTable = await queryInterface.describeTable('Blogs');
    if (blogsTable.blogTopicId) {
      await queryInterface.removeColumn('Blogs', 'blogTopicId');
    }

    // Drop BlogTranslations table
    const tables = await queryInterface.showAllTables();
    if (tables.includes('BlogTranslations')) {
      await queryInterface.dropTable('BlogTranslations');
    }

    // Note: This down migration doesn't restore the deleted EN blogs
    // A full rollback would require more complex logic
    console.log('Migration rolled back: BlogTranslations table dropped');
  },
};
