import sqlite3

conn = sqlite3.connect('redditgapfinder.db')
c = conn.cursor()

# Show what's in the DB
tables = c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
print('Tables:', [t[0] for t in tables])

c.execute('SELECT count(*) FROM ideas')
print('Ideas count:', c.fetchone()[0])

c.execute('SELECT count(*) FROM clusters')
print('Clusters count:', c.fetchone()[0])

c.execute('SELECT name FROM ideas')
names = c.fetchall()
print('Idea names:', [n[0] for n in names])

c.execute('SELECT topic_name FROM clusters')
cnames = c.fetchall()
print('Cluster names:', [n[0] for n in cnames])

# Clear them all
c.execute('DELETE FROM ideas')
print(f'Deleted {c.rowcount} ideas')

c.execute('DELETE FROM clusters')
print(f'Deleted {c.rowcount} clusters')

conn.commit()
conn.close()
print('Database cleared successfully!')
